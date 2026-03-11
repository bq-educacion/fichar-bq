import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import {
  hhmmToMinutes,
  validateManualHoursRange,
  validateManualLogsChronology,
} from "@/lib/utils";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import { manualLogsBodySchema } from "@/schemas/api";
import { logCreateSchema, logSchema } from "@/schemas/db";
import { Log } from "@/types";
import { z } from "zod";
import { saveProjectDedicationsForToday } from "./projectDedications";
import updateUserStatus from "./updateUserStatus";

export type ManualEntry = z.infer<typeof manualLogsBodySchema>;

const replaceLogsWithManual = async (
  email: string,
  entry: ManualEntry
): Promise<Log[]> => {
  const parsedEmail = parseWithSchema(z.string().email(), email);
  const parsedEntry = parseWithSchema(manualLogsBodySchema, entry);

  const rangeValidation = validateManualHoursRange(
    parsedEntry.startHour,
    parsedEntry.endHour,
    new Date(),
    { enforceNowLimit: false }
  );

  if (!rangeValidation.isValid) {
    throw new Error(rangeValidation.error);
  }

  const chronologyValidation = validateManualLogsChronology(
    parsedEntry.startHour,
    parsedEntry.endHour,
    parsedEntry.pauses
  );
  if (!chronologyValidation.isValid) {
    throw new Error(chronologyValidation.error);
  }

  await connectMongo();

  await saveProjectDedicationsForToday(parsedEmail, parsedEntry.projectDedications);

  const clientTimezoneOffsetMinutes =
    parsedEntry.clientTimezoneOffsetMinutes ?? new Date().getTimezoneOffset();

  const userNow = new Date(Date.now() - clientTimezoneOffsetMinutes * 60 * 1000);
  const userYear = userNow.getUTCFullYear();
  const userMonth = userNow.getUTCMonth();
  const userDay = userNow.getUTCDate();

  const userTodayStartUtc = new Date(
    Date.UTC(userYear, userMonth, userDay, 0, 0, 0, 0) +
      clientTimezoneOffsetMinutes * 60 * 1000
  );
  const userTodayEndUtc = new Date(
    Date.UTC(userYear, userMonth, userDay, 23, 59, 59, 999) +
      clientTimezoneOffsetMinutes * 60 * 1000
  );

  await LogModel.deleteMany({
    user: parsedEmail,
    date: { $gte: userTodayStartUtc, $lte: userTodayEndUtc },
  });

  const makeDate = (timeStr: string): Date => {
    const totalMinutes = hhmmToMinutes(timeStr);
    if (totalMinutes === null) {
      throw new Error("Formato de hora invalido");
    }

    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    return new Date(
      Date.UTC(userYear, userMonth, userDay, hh, mm, 0, 0) +
        clientTimezoneOffsetMinutes * 60 * 1000
    );
  };

  const logsToCreate: z.infer<typeof logCreateSchema>[] = [];

  logsToCreate.push(
    parseWithSchema(logCreateSchema, {
      type: "in",
      date: makeDate(parsedEntry.startHour),
      user: parsedEmail,
      manual: true,
      isMobile: false,
    })
  );

  for (const pause of parsedEntry.pauses) {
    logsToCreate.push(
      parseWithSchema(logCreateSchema, {
        type: "pause",
        date: makeDate(pause.start),
        user: parsedEmail,
        manual: true,
        isMobile: false,
      })
    );

    logsToCreate.push(
      parseWithSchema(logCreateSchema, {
        type: "in",
        date: makeDate(pause.end),
        user: parsedEmail,
        manual: true,
        isMobile: false,
      })
    );
  }

  logsToCreate.push(
    parseWithSchema(logCreateSchema, {
      type: "out",
      date: makeDate(parsedEntry.endHour),
      user: parsedEmail,
      manual: true,
      isMobile: false,
    })
  );

  logsToCreate.sort((a, b) => a.date.getTime() - b.date.getTime());

  const createdLogs = await LogModel.insertMany(logsToCreate);

  await updateUserStatus(parsedEmail);

  return parseWithSchema(logSchema.array(), toPlainObject(createdLogs));
};

export default replaceLogsWithManual;
