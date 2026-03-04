import mongoose from "mongoose";

export enum USER_STATUS {
  not_started = "not_started",
  working = "working",
  finished = "finished",
  paused = "paused",
}

export enum LOG_TYPE {
  in = "in",
  out = "out",
  pause = "pause",
  goback = "goback",
}

export enum LOG_NOTES {
  doctor = "doctor",
}

export type UserStats = {
  totalThisWeek: number;
  totalThisMonth: number;
  totalThisYear: number;
  averageThisWeek: number;
  averageThisMonth: number;
  averageThisYear: number;
  logsThisWeekDays: number;
  logsThisMonthDays: number;
  logsThisYearDays: number;
  manualLogsThisWeek: number;
  manualLogsThisMonth: number;
  manualLogsThisYear: number;
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
  user: string;
  isMobile?: boolean;
  manual?: boolean;
  note?: LOG_NOTES;
  logFile?: string;
};

export type UserStatus = {
  status: USER_STATUS;
  date?: Date;
  startDate?: Date;
  hoursToday?: number;
  isMobile?: boolean;
};

export type LogsStats = {
  total: number;
  average: number;
  logsDays: number;
  manualLogsDays: number;
};
