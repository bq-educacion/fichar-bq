import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { hhmmToMinutes, validateManualHoursRange } from "@/lib/utils";
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

  await connectMongo();

  await saveProjectDedicationsForToday(parsedEmail, parsedEntry.projectDedications);

  const todayMidnight = new Date(new Date().setHours(0, 0, 0, 0));

  await LogModel.deleteMany({
    user: parsedEmail,
    date: { $gte: todayMidnight },
  });

  const makeDate = (timeStr: string): Date => {
    const totalMinutes = hhmmToMinutes(timeStr);
    if (totalMinutes === null) {
      throw new Error("Formato de hora invalido");
    }

    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    const date = new Date(todayMidnight);
    date.setHours(hh, mm, 0, 0);
    return date;
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
