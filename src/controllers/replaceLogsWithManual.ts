import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { LOG_TYPE, Log } from "@/types";
import updateUserStatus from "./updateUserStatus";

export type ManualEntry = {
  startHour: string; // "HH:MM"
  endHour: string; // "HH:MM"
  pauses: { start: string; end: string }[]; // each "HH:MM"
};

const replaceLogsWithManual = async (
  email: string,
  entry: ManualEntry
): Promise<Log[]> => {
  await connectMongo();

  const today = new Date();
  const todayMidnight = new Date(today).setHours(0, 0, 0, 0);

  // Delete all logs for today
  await LogModel.deleteMany({
    user: email,
    date: { $gte: new Date(todayMidnight) },
  });

  const makeDate = (timeStr: string): Date => {
    const [hh, mm] = timeStr.split(":").map(Number);
    const d = new Date(todayMidnight);
    d.setHours(hh, mm, 0, 0);
    return d;
  };

  const logsToCreate: { type: LOG_TYPE; date: Date; user: string; manual: boolean }[] = [];

  // Initial clock-in
  logsToCreate.push({
    type: LOG_TYPE.in,
    date: makeDate(entry.startHour),
    user: email,
    manual: true,
  });

  // Pauses: each pause is a pause event + a resume (in) event
  for (const pause of entry.pauses) {
    logsToCreate.push({
      type: LOG_TYPE.pause,
      date: makeDate(pause.start),
      user: email,
      manual: true,
    });
    logsToCreate.push({
      type: LOG_TYPE.in,
      date: makeDate(pause.end),
      user: email,
      manual: true,
    });
  }

  // Final clock-out
  logsToCreate.push({
    type: LOG_TYPE.out,
    date: makeDate(entry.endHour),
    user: email,
    manual: true,
  });

  // Sort by date to ensure correct order
  logsToCreate.sort((a, b) => a.date.getTime() - b.date.getTime());

  const createdLogs = await LogModel.insertMany(logsToCreate);

  await updateUserStatus(email);

  return createdLogs;
};

export default replaceLogsWithManual;
