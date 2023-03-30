export enum USER_STATUS {
  not_started = "not_started",
  working = "working",
  finished = "finished",
  paused = "paused",
  error = "error",
}

export enum LOG_TYPE {
  in = "in",
  out = "out",
  pause = "pause",
  error = "error",
}

export type UserStats = {
  averageThisWeek: number;
  averageThisMonth: number;
  averageThisYear: number;
  errorLogsThisWeek: number;
  errorLogsThisMonth: number;
  errorLogsThisYear: number;
  logsThisWeekDays: number;
  logsThisMonthDays: number;
  logsThisYearDays: number;
};

export type UserToday = {
  hoursToday: number;
};
