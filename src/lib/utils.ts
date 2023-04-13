// remove logs from days in which there is an error

import { LOG_TYPE, Log } from "@/types";

export const removeErrorLogs = (logs: Log[]) =>
  logs.filter((log) => {
    const date = new Date(log.date).setHours(0, 0, 0, 0);
    const logsThisDay = logs.filter(
      (log) => new Date(log.date).setHours(0, 0, 0, 0) === date
    );
    return !logsThisDay.some((log) => log.type === LOG_TYPE.error);
  });

// count the number of days in which there is an error log
export const numberOfErrorLogs = (logs: Log[]) =>
  logs.reduce((acc, log) => {
    if (log.type === LOG_TYPE.error) return acc + 1;
    return acc;
  }, 0);

export const logsIn = (logs: Log[]) =>
  logs
    .filter((log) => log.type === LOG_TYPE.in)
    .reduce((acc, log) => acc + log.date.getTime(), 0);

export const logsOut = (logs: Log[]) =>
  logs
    .filter((log) => log.type === LOG_TYPE.out || log.type === LOG_TYPE.pause)
    .reduce((acc, log) => acc + log.date.getTime(), 0);

export const numberOfDays = (logs: Log[]) =>
  // count how many logs of different days there are
  logs.reduce((acc: number[], log) => {
    const date = new Date(log.date).setHours(0, 0, 0, 0);
    if (!acc.includes(date)) {
      acc.push(date);
    }
    return acc;
  }, []).length;
