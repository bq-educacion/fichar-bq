import { LOG_TYPE, Log, LogsStats } from "@/types";

// Compute elapsed hours from a list of logs using pair-based subtraction.
// Pairs each "in" with the next "out"/"pause" to get precise durations.
// If addCurrentTime is true and the last log is "in", pairs it with Date.now().
export const computeElapsedHours = (
  logs: Log[],
  addCurrentTime: boolean = false,
  now?: Date
): number => {
  if (logs.length === 0) return 0;

  const currentTime = now ?? new Date();
  let totalMs = 0;
  let lastInDate: Date | null = null;

  for (const log of logs) {
    if (log.type === LOG_TYPE.in) {
      lastInDate = new Date(log.date);
    } else if (
      (log.type === LOG_TYPE.out || log.type === LOG_TYPE.pause) &&
      lastInDate !== null
    ) {
      totalMs += new Date(log.date).getTime() - lastInDate.getTime();
      lastInDate = null;
    }
  }

  // if still clocked in and addCurrentTime is true, count time until now
  if (lastInDate !== null && addCurrentTime) {
    totalMs += currentTime.getTime() - lastInDate.getTime();
  }

  return totalMs / 1000 / 60 / 60;
};

// Sum of timestamps for "in" logs (kept for backward compatibility)
export const logsIn = (logs: Log[]) => {
  const filteredLogs = logs.filter((log) => log.type === LOG_TYPE.in);
  const result = filteredLogs.reduce((acc, log) => acc + new Date(log.date).getTime(), 0);
  return result;
};

// Sum of timestamps for "out"/"pause" logs (kept for backward compatibility)
export const logsOut = (logs: Log[]) =>
  logs
    .filter((log) => log.type === LOG_TYPE.out || log.type === LOG_TYPE.pause)
    .reduce((acc, log) => acc + new Date(log.date).getTime(), 0);

export const numberOfDays = (logs: Log[]) =>
  // count how many logs of different days there are
  logs.reduce((acc: number[], log) => {
    const date = new Date(log.date).setHours(0, 0, 0, 0);
    if (!acc.includes(date)) {
      acc.push(date);
    }
    return acc;
  }, []).length;

export const getHoursToday = (logs: Log[], now?: Date) => {
  // not started yet today
  if (!logs.some((log) => log.type === LOG_TYPE.in)) {
    return 0;
  }

  // use pair-based computation; add current time if last log is "in"
  const addCurrentTime = logs.length > 0 && logs.at(-1)?.type === LOG_TYPE.in;
  return computeElapsedHours(logs, addCurrentTime, now);
};

// decimal hours to hh:mm
export const decimalToHours = (decimal: number) => {
  const absDecimal = Math.abs(decimal);
  const sign = decimal < 0 ? "-" : "";
  const hours = Math.floor(absDecimal);
  const minutes = Math.floor((absDecimal - hours) * 60);
  return `${sign}${hours}h${minutes}m`;
};

export const datetoHHMM = (date: Date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours}:${minutes < 10 ? `0${minutes}` : minutes}`;
};

// count the number of DAYS in which there is a manual log
export const numberOfManualDays = (logs: Log[]) => {
  const manualDays = new Set<number>();
  logs.forEach((log) => {
    if (log.manual) {
      manualDays.add(new Date(log.date).setHours(0, 0, 0, 0));
    }
  });
  return manualDays.size;
};

export const realLogs = (logs: Log[]) => {
  // get last index with type out (truncate trailing incomplete sessions)
  let lastOutIndex = -1;
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].type === LOG_TYPE.out) {
      lastOutIndex = i;
      break;
    }
  }

  return logs.slice(0, lastOutIndex + 1);
};

export const statsFromLogs = (logs: Log[]): LogsStats => {
  const rlogs = realLogs(logs);

  // count how many logs of different days there are
  const logsDays = numberOfDays(rlogs);

  // compute total hours using pair-based calculation
  const total = computeElapsedHours(rlogs);

  // average time worked per day
  const average = logsDays === 0 ? 0 : total / logsDays;

  // number of days with manually introduced logs
  const manualLogsDays = numberOfManualDays(rlogs);

  return {
    total,
    average,
    logsDays,
    manualLogsDays,
  };
};
