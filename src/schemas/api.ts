import { z } from "zod";
import {
  logSchema,
  logsStatsSchema,
  mongoIdSchema,
  userSchema,
  userStatsSchema,
  userStatusSchema,
  userTodaySchema,
  logTypeEnumSchema,
} from "./db";

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const hhmmSchema = z.string().regex(HHMM_REGEX, "Invalid HH:MM format");

export const paginationBodySchema = z
  .object({
    page: z.number().int().min(1),
    numberofdays: z.number().int().min(1),
  })
  .strict();

export const logActivityBodySchema = z
  .object({
    type: logTypeEnumSchema,
    isMobile: z.boolean(),
  })
  .strict();

export const logActivityResponseSchema = logSchema;

export const logDoctorFileBodySchema = z
  .object({
    _id: mongoIdSchema,
    logFile: z.string().url(),
  })
  .strict();

export const logDoctorFileResponseSchema = logSchema;

export const manualPauseSchema = z
  .object({
    start: hhmmSchema,
    end: hhmmSchema,
  })
  .strict();

export const manualLogsBodySchema = z
  .object({
    startHour: hhmmSchema,
    endHour: hhmmSchema,
    pauses: z.array(manualPauseSchema).default([]),
  })
  .strict();

export const manualLogsResponseSchema = z.array(logSchema);

export const meResponseSchema = userSchema;

export const myUserLogsBodySchema = paginationBodySchema;

export const myUserLogsResponseSchema = z.array(logSchema);

export const myUserStatsResponseSchema = userStatsSchema;

export const removeLastLogResponseSchema = logSchema;

export const setLegalResponseSchema = z.literal("OK");

export const uploadUrlQuerySchema = z
  .object({
    file: z.string().min(1),
  })
  .strict();

export const uploadUrlResponseSchema = z
  .object({
    url: z.string().url(),
    fields: z.record(z.string()),
  })
  .strict();

export const userStatusResponseSchema = userStatusSchema;

export const userTodayResponseSchema = userTodaySchema;

export const workerLogsBodySchema = paginationBodySchema
  .extend({
    workerEmail: z.string().email(),
  })
  .strict();

export const workerLogsResponseSchema = z.array(logSchema);

export const workerStatsBodySchema = z
  .object({
    workerEmail: z.string().email(),
  })
  .strict();

export const workerStatsResponseSchema = userStatsSchema;

export const allUsersStatusResponseSchema = z.array(
  z
    .object({
      email: z.string().email(),
      status: userStatusSchema,
      image: z.string().default(""),
      name: z.string().default(""),
    })
    .strict()
);

export const managerWorkersResponseSchema = z.array(
  userSchema.extend({ stats: logsStatsSchema }).strict()
);

export const authGoogleProfileSchema = z
  .object({
    email: z.string().email(),
    email_verified: z.boolean(),
    picture: z.string().url().optional(),
    name: z.string().optional(),
  })
  .strict();

export type PaginationBody = z.infer<typeof paginationBodySchema>;
export type LogActivityBody = z.infer<typeof logActivityBodySchema>;
export type LogDoctorFileBody = z.infer<typeof logDoctorFileBodySchema>;
export type ManualLogsBody = z.infer<typeof manualLogsBodySchema>;
export type MyUserLogsBody = z.infer<typeof myUserLogsBodySchema>;
export type WorkerLogsBody = z.infer<typeof workerLogsBodySchema>;
export type WorkerStatsBody = z.infer<typeof workerStatsBodySchema>;
export type UploadUrlQuery = z.infer<typeof uploadUrlQuerySchema>;
export type AuthGoogleProfile = z.infer<typeof authGoogleProfileSchema>;
export type LogActivityResponse = z.infer<typeof logActivityResponseSchema>;
export type LogDoctorFileResponse = z.infer<typeof logDoctorFileResponseSchema>;
export type ManualLogsResponse = z.infer<typeof manualLogsResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type MyUserLogsResponse = z.infer<typeof myUserLogsResponseSchema>;
export type MyUserStatsResponse = z.infer<typeof myUserStatsResponseSchema>;
export type RemoveLastLogResponse = z.infer<typeof removeLastLogResponseSchema>;
export type SetLegalResponse = z.infer<typeof setLegalResponseSchema>;
export type UploadUrlResponse = z.infer<typeof uploadUrlResponseSchema>;
export type UserStatusResponse = z.infer<typeof userStatusResponseSchema>;
export type UserTodayResponse = z.infer<typeof userTodayResponseSchema>;
export type WorkerLogsResponse = z.infer<typeof workerLogsResponseSchema>;
export type WorkerStatsResponse = z.infer<typeof workerStatsResponseSchema>;
export type AllUsersStatusResponse = z.infer<typeof allUsersStatusResponseSchema>;
