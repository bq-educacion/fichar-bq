// remove logs from days in which there is an error

import { LOG_TYPE, Log } from "@/types";
import mongoose from "mongoose";
import { mongo } from "mongoose";

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

export const getHoursToday = (logs: Log[]) => {
  const logsIn: { date: Date; type: LOG_TYPE }[] = logs.filter(
    (log) => log.type === LOG_TYPE.in
  );
  const logsOut: { date: Date; type: LOG_TYPE }[] = logs.filter(
    (log) => log.type === LOG_TYPE.out || log.type === LOG_TYPE.pause
  );

  if (logsOut.length === 0) {
    logsOut.push({
      date: new Date(),
      type: LOG_TYPE.out,
    });
  }

  if (
    logsOut.length > 0 &&
    logsIn.length > 0 &&
    logsOut.at(-1)!.date < logsIn.at(-1)!.date
  ) {
    logsOut.push({
      date: new Date(),
      type: LOG_TYPE.out,
    });
  }

  // sum of todays in
  const sumIn = logsIn.reduce((acc, log) => {
    return acc + log.date.getTime();
  }, 0);

  // sum of todays out
  const sumOut = logsOut.reduce((acc, log) => {
    return acc + log.date.getTime();
  }, 0);

  const hoursToday = (sumOut - sumIn) / 1000 / 60 / 60;
  return hoursToday;
};

// decimal hours to hh:mm
export const decimalToHours = (decimal: number) => {
  const hours = Math.floor(decimal);
  const minutes = Math.floor((decimal - hours) * 60);
  return `${hours}h${minutes < 10 ? `0${minutes}` : minutes}m`;
};
