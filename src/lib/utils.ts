import { LOG_TYPE, Log, LogsStats } from "@/types";

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const sortLogsByDate = (logs: Log[]): Log[] =>
  [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

// Compute elapsed hours from a list of logs using pair-based subtraction.
// Pairs each "in" with the next "out"/"pause" to get precise durations.
// If addCurrentTime is true and the last log is "in", pairs it with Date.now().
export const computeElapsedHours = (
  logs: Log[],
  addCurrentTime: boolean = false,
  now?: Date
): number => {
  if (logs.length === 0) return 0;

  const sortedLogs = sortLogsByDate(logs);
  const currentTime = now ?? new Date();
  let totalMs = 0;
  let lastInDate: Date | null = null;

  for (const log of sortedLogs) {
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
  const sortedLogs = sortLogsByDate(logs);

  // not started yet today
  if (!sortedLogs.some((log) => log.type === LOG_TYPE.in)) {
    return 0;
  }

  // use pair-based computation; add current time if last log is "in"
  const addCurrentTime =
    sortedLogs.length > 0 && sortedLogs.at(-1)?.type === LOG_TYPE.in;
  return computeElapsedHours(sortedLogs, addCurrentTime, now);
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

export const hhmmToMinutes = (time: string): number | null => {
  const match = HHMM_REGEX.exec(time);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
};

export const dateToTimeInputValue = (date: Date) =>
  `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

type ManualHoursValidation =
  | { isValid: true; error: null }
  | { isValid: false; error: string };

export const validateManualHoursRange = (
  startHour: string,
  endHour: string,
  now: Date = new Date(),
  options: { enforceNowLimit?: boolean } = {}
): ManualHoursValidation => {
  const startMinutes = hhmmToMinutes(startHour);
  const endMinutes = hhmmToMinutes(endHour);

  if (startMinutes === null || endMinutes === null) {
    return {
      isValid: false,
      error: "Formato de hora invalido",
    };
  }

  if (startMinutes >= endMinutes) {
    return {
      isValid: false,
      error: "La hora de entrada debe ser anterior a la hora de salida",
    };
  }

  if (options.enforceNowLimit ?? true) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (endMinutes > nowMinutes) {
      return {
        isValid: false,
        error: "La hora de salida no puede ser posterior a la hora actual",
      };
    }
  }

  return {
    isValid: true,
    error: null,
  };
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
  const sortedLogs = sortLogsByDate(logs);

  // get last index with type out (truncate trailing incomplete sessions)
  let lastOutIndex = -1;
  for (let i = sortedLogs.length - 1; i >= 0; i--) {
    if (sortedLogs[i].type === LOG_TYPE.out) {
      lastOutIndex = i;
      break;
    }
  }

  return sortedLogs.slice(0, lastOutIndex + 1);
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
