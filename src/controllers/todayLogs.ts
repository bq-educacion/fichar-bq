import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { hhmmToMinutes, validateSequentialUniqueTimes } from "@/lib/utils";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import { todayLogsUpdateBodySchema } from "@/schemas/api";
import { logSchema } from "@/schemas/db";
import { LOG_TYPE, Log } from "@/types";
import { z } from "zod";
import { clearProjectDedicationsForToday } from "./projectDedications";
import updateUserStatus from "./updateUserStatus";

const emailSchema = z.string().email();

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const getTodayLogsSorted = async (email: string) => {
  const { start, end } = getTodayRange();

  return await LogModel.find({
    user: email,
    date: { $gte: start, $lte: end },
  })
    .sort({ date: 1, _id: 1 })
    .exec();
};

const makeDateFromTodayAndTime = (baseDate: Date, hhmm: string) => {
  const totalMinutes = hhmmToMinutes(hhmm);
  if (totalMinutes === null) {
    throw new Error("Formato de hora invalido");
  }

  const result = new Date(baseDate);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  result.setHours(hours, minutes, 0, 0);

  return result;
};

export const getTodayLogs = async (email: string): Promise<Log[]> => {
  const parsedEmail = parseWithSchema(emailSchema, email);

  await connectMongo();
  const logs = await getTodayLogsSorted(parsedEmail);

  return parseWithSchema(logSchema.array(), toPlainObject(logs));
};

export const updateTodayLogsTimes = async (
  email: string,
  body: z.infer<typeof todayLogsUpdateBodySchema>
): Promise<Log[]> => {
  const parsedEmail = parseWithSchema(emailSchema, email);
  const parsedBody = parseWithSchema(todayLogsUpdateBodySchema, body);

  await connectMongo();

  const todayLogs = await getTodayLogsSorted(parsedEmail);
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

  const { start: todayStart } = getTodayRange();
  const operations = todayLogs.map((log, index) => ({
    updateOne: {
      filter: { _id: log._id, user: parsedEmail },
      update: {
        $set: {
          date: makeDateFromTodayAndTime(todayStart, updatedTimesInOrder[index]),
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
  const updatedLogs = await getTodayLogsSorted(parsedEmail);

  return parseWithSchema(logSchema.array(), toPlainObject(updatedLogs));
};

export const deleteTodayLogsExceptFirst = async (email: string): Promise<Log[]> => {
  const parsedEmail = parseWithSchema(emailSchema, email);

  await connectMongo();

  const todayLogs = await getTodayLogsSorted(parsedEmail);
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

  const remainingLogs = await getTodayLogsSorted(parsedEmail);
  return parseWithSchema(logSchema.array(), toPlainObject(remainingLogs));
};
