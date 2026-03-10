import { z } from "zod";

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const mongoIdSchema = z
  .string()
  .regex(MONGO_ID_REGEX, "Invalid MongoDB ObjectId");

export const mongoIdLikeSchema = z
  .any()
  .transform((value) => {
    if (typeof value === "string") {
      return value;
    }

    if (value && typeof (value as { toString?: () => string }).toString === "function") {
      return (value as { toString: () => string }).toString();
    }

    return value;
  })
  .pipe(mongoIdSchema);

export const dateSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }

  return value;
}, z.date());

export const userStatusEnumSchema = z.enum([
  "not_started",
  "working",
  "finished",
  "paused",
]);

export const logTypeEnumSchema = z.enum(["in", "out", "pause", "goback"]);

export const logNotesEnumSchema = z.enum(["doctor"]);

export const userStatusSchema = z
  .object({
    status: userStatusEnumSchema,
    date: dateSchema.optional(),
    startDate: dateSchema.optional(),
    hoursToday: z.number().optional(),
    isMobile: z.boolean().optional(),
  })
  .strict();

export const userSchema = z
  .object({
    _id: mongoIdLikeSchema,
    id: z.string().optional(),
    email: z.string().email(),
    active: z.boolean(),
    isManager: z.boolean(),
    admin: z.boolean().optional().default(false),
    image: z.string().default(""),
    name: z.string().default(""),
    status: userStatusSchema,
    manager: z.string().email().optional(),
    legal: z.boolean().default(false),
  })
  .strict();

export const userCreateSchema = z
  .object({
    email: z.string().email(),
    active: z.boolean().default(true),
    manager: z.string().email().optional(),
    name: z.string().optional(),
    image: z.string().optional(),
    isManager: z.boolean().default(false),
    admin: z.boolean().optional().default(false),
    status: userStatusSchema.optional(),
    legal: z.boolean().default(false),
  })
  .strict();

export const logSchema = z
  .object({
    _id: mongoIdLikeSchema,
    type: logTypeEnumSchema,
    date: dateSchema,
    user: z.string().email(),
    isMobile: z.boolean().optional(),
    manual: z.boolean().optional(),
    note: logNotesEnumSchema.optional(),
    logFile: z.string().url().optional(),
  })
  .strict();

export const logCreateSchema = z
  .object({
    type: logTypeEnumSchema,
    date: dateSchema,
    user: z.string().email(),
    isMobile: z.boolean().default(false),
    manual: z.boolean().default(false),
    note: logNotesEnumSchema.optional(),
    logFile: z.string().url().optional(),
  })
  .strict();

export const projectSchema = z
  .object({
    _id: mongoIdLikeSchema,
    name: z.string().min(1),
    startDate: dateSchema,
    endData: dateSchema,
    user: z.array(mongoIdLikeSchema),
  })
  .strict()
  .refine((project) => project.endData >= project.startDate, {
    message: "endData must be greater than or equal to startDate",
    path: ["endData"],
  });

export const projectCreateSchema = z
  .object({
    name: z.string().min(1),
    startDate: dateSchema,
    endData: dateSchema,
    user: z.array(mongoIdLikeSchema).default([]),
  })
  .strict()
  .refine((project) => project.endData >= project.startDate, {
    message: "endData must be greater than or equal to startDate",
    path: ["endData"],
  });

export const userStatsSchema = z
  .object({
    totalThisWeek: z.number(),
    totalThisMonth: z.number(),
    totalThisYear: z.number(),
    averageThisWeek: z.number(),
    averageThisMonth: z.number(),
    averageThisYear: z.number(),
    logsThisWeekDays: z.number(),
    logsThisMonthDays: z.number(),
    logsThisYearDays: z.number(),
    manualLogsThisWeek: z.number(),
    manualLogsThisMonth: z.number(),
    manualLogsThisYear: z.number(),
  })
  .strict();

export const userTodaySchema = z
  .object({
    hoursToday: z.number(),
  })
  .strict();

export const logsStatsSchema = z
  .object({
    total: z.number(),
    average: z.number(),
    logsDays: z.number(),
    manualLogsDays: z.number(),
  })
  .strict();

export type UserStatusValue = z.infer<typeof userStatusEnumSchema>;
export type LogTypeValue = z.infer<typeof logTypeEnumSchema>;
export type LogNotesValue = z.infer<typeof logNotesEnumSchema>;

export type UserStatus = z.infer<typeof userStatusSchema>;
export type User = z.infer<typeof userSchema>;
export type UserCreate = z.infer<typeof userCreateSchema>;
export type Log = z.infer<typeof logSchema>;
export type LogCreate = z.infer<typeof logCreateSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ProjectCreate = z.infer<typeof projectCreateSchema>;
export type UserStats = z.infer<typeof userStatsSchema>;
export type UserToday = z.infer<typeof userTodaySchema>;
export type LogsStats = z.infer<typeof logsStatsSchema>;
