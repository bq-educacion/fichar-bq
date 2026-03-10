import { z } from "zod";
import {
  logNotesEnumSchema,
  logSchema,
  logTypeEnumSchema,
  logsStatsSchema,
  projectDedicationSchema,
  projectSchema,
  userSchema,
  userStatsSchema,
  userStatusEnumSchema,
  userStatusSchema,
  userTodaySchema,
} from "@/schemas/db";

export const USER_STATUS = userStatusEnumSchema.enum;
export type USER_STATUS = z.infer<typeof userStatusEnumSchema>;

export const LOG_TYPE = logTypeEnumSchema.enum;
export type LOG_TYPE = z.infer<typeof logTypeEnumSchema>;

export const LOG_NOTES = logNotesEnumSchema.enum;
export type LOG_NOTES = z.infer<typeof logNotesEnumSchema>;

export type UserStats = z.infer<typeof userStatsSchema>;
export type UserToday = z.infer<typeof userTodaySchema>;
export type User = z.infer<typeof userSchema>;
export type Log = z.infer<typeof logSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type LogsStats = z.infer<typeof logsStatsSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ProjectDedication = z.infer<typeof projectDedicationSchema>;
