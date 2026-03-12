import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { hhmmToMinutes, validateSequentialUniqueTimes } from "@/lib/utils";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import {
  timezoneOffsetMinutesSchema,
  todayLogsUpdateBodySchema,
} from "@/schemas/api";
import { logSchema } from "@/schemas/db";
import { LOG_TYPE, Log } from "@/types";
import { z } from "zod";
import { clearProjectDedicationsForToday } from "./projectDedications";
import updateUserStatus from "./updateUserStatus";

const emailSchema = z.string().email();

const resolveTodayContext = (clientTimezoneOffsetMinutes?: number) => {
  const parsedOffsetMinutes =
    parseWithSchema(
      timezoneOffsetMinutesSchema.optional(),
      clientTimezoneOffsetMinutes
    ) ?? new Date().getTimezoneOffset();

  const userNow = new Date(Date.now() - parsedOffsetMinutes * 60 * 1000);
  const userYear = userNow.getUTCFullYear();
  const userMonth = userNow.getUTCMonth();
  const userDay = userNow.getUTCDate();

  const todayStartUtc = new Date(
    Date.UTC(userYear, userMonth, userDay, 0, 0, 0, 0) +
      parsedOffsetMinutes * 60 * 1000
  );
  const todayEndUtc = new Date(
    Date.UTC(userYear, userMonth, userDay, 23, 59, 59, 999) +
      parsedOffsetMinutes * 60 * 1000
  );

  return {
    clientTimezoneOffsetMinutes: parsedOffsetMinutes,
    userNow,
    userYear,
    userMonth,
    userDay,
    todayStartUtc,
    todayEndUtc,
    nowMinutes: userNow.getUTCHours() * 60 + userNow.getUTCMinutes(),
  };
};

const getTodayLogsSorted = async (
  email: string,
  context: ReturnType<typeof resolveTodayContext>
) => {
  return await LogModel.find({
    user: email,
    date: { $gte: context.todayStartUtc, $lte: context.todayEndUtc },
  })
    .sort({ date: 1, _id: 1 })
    .exec();
};

const makeDateFromTodayAndTime = (
  context: ReturnType<typeof resolveTodayContext>,
  hhmm: string
) => {
  const totalMinutes = hhmmToMinutes(hhmm);
  if (totalMinutes === null) {
    throw new Error("Formato de hora invalido");
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return new Date(
    Date.UTC(context.userYear, context.userMonth, context.userDay, hours, minutes, 0, 0) +
      context.clientTimezoneOffsetMinutes * 60 * 1000
  );
};

export const getTodayLogs = async (
  email: string,
  clientTimezoneOffsetMinutes?: number
): Promise<Log[]> => {
  const parsedEmail = parseWithSchema(emailSchema, email);
  const todayContext = resolveTodayContext(clientTimezoneOffsetMinutes);

  await connectMongo();
  const logs = await getTodayLogsSorted(parsedEmail, todayContext);

  return parseWithSchema(logSchema.array(), toPlainObject(logs));
};

export const updateTodayLogsTimes = async (
  email: string,
  body: z.infer<typeof todayLogsUpdateBodySchema>
): Promise<Log[]> => {
  const parsedEmail = parseWithSchema(emailSchema, email);
  const parsedBody = parseWithSchema(todayLogsUpdateBodySchema, body);
  const todayContext = resolveTodayContext(parsedBody.clientTimezoneOffsetMinutes);

  await connectMongo();

  const todayLogs = await getTodayLogsSorted(parsedEmail, todayContext);
  if (todayLogs.length === 0) {
    throw new Error("No hay fichajes de hoy para editar");
  }

  if (parsedBody.logs.length !== todayLogs.length) {
    throw new Error("Debes editar todos los fichajes de hoy");
  }

  const incomingById = new Map<string, string>();
  for (const item of parsedBody.logs) {
    if (incomingById.has(item._id)) {
      throw new Error("Hay fichajes repetidos en la edición");
    }
    incomingById.set(item._id, item.time);
  }

  const updatedTimesInOrder = todayLogs.map((log) => {
    const time = incomingById.get(log._id.toString());
    if (!time) {
      throw new Error("La edición no coincide con los fichajes actuales");
    }
    return time;
  });

  const chronologyValidation = validateSequentialUniqueTimes(updatedTimesInOrder);
  if (!chronologyValidation.isValid) {
    throw new Error(chronologyValidation.error);
  }

  const hasFutureTimes = updatedTimesInOrder.some((time) => {
    const minutes = hhmmToMinutes(time);
    return minutes !== null && minutes > todayContext.nowMinutes;
  });
  if (hasFutureTimes) {
    throw new Error("No puedes introducir una hora posterior a la hora actual");
  }

  const operations = todayLogs.map((log, index) => ({
    updateOne: {
      filter: { _id: log._id, user: parsedEmail },
      update: {
        $set: {
          date: makeDateFromTodayAndTime(todayContext, updatedTimesInOrder[index]),
          manual: true,
        },
      },
    },
  }));

  await LogModel.bulkWrite(operations);

  const resultingLastLog = todayLogs[todayLogs.length - 1];
  if (resultingLastLog.type !== LOG_TYPE.out) {
    await clearProjectDedicationsForToday(parsedEmail);
  }

  await updateUserStatus(parsedEmail);
  const updatedLogs = await getTodayLogsSorted(parsedEmail, todayContext);

  return parseWithSchema(logSchema.array(), toPlainObject(updatedLogs));
};

export const deleteTodayLogsExceptFirst = async (
  email: string,
  clientTimezoneOffsetMinutes?: number
): Promise<Log[]> => {
  const parsedEmail = parseWithSchema(emailSchema, email);
  const todayContext = resolveTodayContext(clientTimezoneOffsetMinutes);

  await connectMongo();

  const todayLogs = await getTodayLogsSorted(parsedEmail, todayContext);
  if (todayLogs.length === 0) {
    throw new Error("No hay fichajes de hoy para eliminar");
  }

  if (todayLogs.length > 1) {
    const idsToDelete = todayLogs.slice(1).map((log) => log._id);
    await LogModel.deleteMany({
      _id: { $in: idsToDelete },
      user: parsedEmail,
    }).exec();
  }

  const firstLog = todayLogs[0];
  if (firstLog.type !== LOG_TYPE.out) {
    await clearProjectDedicationsForToday(parsedEmail);
  }

  await updateUserStatus(parsedEmail);

  const remainingLogs = await getTodayLogsSorted(parsedEmail, todayContext);
  return parseWithSchema(logSchema.array(), toPlainObject(remainingLogs));
};
