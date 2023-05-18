import mongoose from "mongoose";

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
  goback = "goback",
}

export type UserStats = {
  totalThisWeek: number;
  totalThisMonth: number;
  totalThisYear: number;
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

export type User = {
  _id: mongoose.Schema.Types.ObjectId;
  id: string;
  email: string;
  active: boolean;
  isManager: boolean;
  image: string;
  name: string;
  status: UserStatus;
  manager?: string;
  legal: boolean;
};

export type Log = {
  _id: mongoose.Schema.Types.ObjectId | string;
  type: LOG_TYPE;
  date: Date;
  user: User;
  error_text?: string;
  error_hours?: number;
};

export type UserStatus = {
  status: USER_STATUS;
  date?: Date;
  startDate?: Date;
  hoursToday?: number;
};

export type LogsStats = {
  total: number;
  average: number;
  logsDays: number;
  errorLogs: number;
};
