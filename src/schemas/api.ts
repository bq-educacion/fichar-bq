import { z } from "zod";
import {
  dateSchema,
  dedicationPercentageSchema,
  logSchema,
  logsStatsSchema,
  mongoIdSchema,
  projectSchema,
  userSchema,
  userStatsSchema,
  userStatusSchema,
  userTodaySchema,
  logTypeEnumSchema,
} from "./db";

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const hhmmSchema = z.string().regex(HHMM_REGEX, "Invalid HH:MM format");
export const yyyyMmDdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid YYYY-MM-DD format");

export const paginationBodySchema = z
  .object({
    page: z.number().int().min(1),
    numberofdays: z.number().int().min(1),
  })
  .strict();

export const projectDedicationInputSchema = z
  .object({
    projectId: mongoIdSchema,
    dedication: dedicationPercentageSchema,
  })
  .strict();

export const logActivityBodySchema = z
  .object({
    type: logTypeEnumSchema,
    isMobile: z.boolean(),
    projectDedications: z.array(projectDedicationInputSchema).default([]),
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
    projectDedications: z.array(projectDedicationInputSchema).default([]),
    clientTimezoneOffsetMinutes: z.number().int().min(-840).max(840).optional(),
    targetDate: yyyyMmDdSchema.optional(),
    preserveProjectDedications: z.boolean().default(false),
  })
  .strict();

export const manualLogsResponseSchema = z.array(logSchema);

export const meResponseSchema = userSchema;

export const myUserLogsBodySchema = paginationBodySchema;

export const myUserLogsResponseSchema = z.array(logSchema);

export const myUserStatsResponseSchema = userStatsSchema;

export const removeLastLogResponseSchema = logSchema;

export const myProjectDedicationProjectSchema = z
  .object({
    _id: mongoIdSchema,
    name: z.string().min(1),
  })
  .strict();

export const myProjectDedicationsResponseSchema = z
  .object({
    showDedications: z.boolean().default(true),
    projects: z.array(myProjectDedicationProjectSchema),
    existingDedications: z.array(projectDedicationInputSchema).default([]),
  })
  .strict();

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

const adminProjectFieldsObjectSchema = z
  .object({
    name: z.string().min(1),
    startDate: dateSchema,
    endData: dateSchema,
    user: z.array(mongoIdSchema).default([]),
  })
  .strict();

const adminProjectFieldsSchema = adminProjectFieldsObjectSchema
  .refine((project) => project.endData >= project.startDate, {
    message: "endData must be greater than or equal to startDate",
    path: ["endData"],
  });

export const adminProjectCreateBodySchema = adminProjectFieldsSchema;

export const adminProjectUpdateBodySchema = adminProjectFieldsObjectSchema
  .extend({
    _id: mongoIdSchema,
  })
  .strict()
  .refine((project) => project.endData >= project.startDate, {
    message: "endData must be greater than or equal to startDate",
    path: ["endData"],
  });

export const adminProjectDeleteBodySchema = z
  .object({
    _id: mongoIdSchema,
  })
  .strict();

export const adminProjectResponseSchema = projectSchema;
export const adminProjectsResponseSchema = z.array(projectSchema);

const adminDepartmentFieldsSchema = z
  .object({
    name: z.string().min(1),
    costesGenerales: z.boolean().default(false),
  })
  .strict();

export const adminDepartmentCreateBodySchema = adminDepartmentFieldsSchema;

export const adminDepartmentUpdateBodySchema = adminDepartmentFieldsSchema
  .extend({
    _id: mongoIdSchema,
  })
  .strict();

export const adminDepartmentDeleteBodySchema = z
  .object({
    _id: mongoIdSchema,
  })
  .strict();

export const adminDepartmentOptionSchema = z
  .object({
    _id: mongoIdSchema,
    name: z.string().min(1),
    costesGenerales: z.boolean().default(false),
  })
  .strict();

export const adminDepartmentPersonSchema = z
  .object({
    _id: mongoIdSchema,
    email: z.string().email(),
    name: z.string().default(""),
    active: z.boolean().default(true),
  })
  .strict();

export const adminDepartmentSchema = adminDepartmentOptionSchema
  .extend({
    people: z.array(adminDepartmentPersonSchema).default([]),
  })
  .strict();

export const adminDepartmentResponseSchema = adminDepartmentSchema;
export const adminDepartmentsResponseSchema = z.array(adminDepartmentSchema);
export const adminDepartmentOptionsResponseSchema = z.array(adminDepartmentOptionSchema);

export const adminUserOptionSchema = z
  .object({
    _id: mongoIdSchema,
    email: z.string().email(),
    name: z.string().default(""),
    department: mongoIdSchema.nullable().optional(),
    departmentCostesGenerales: z.boolean().default(false),
  })
  .strict();

export const adminUsersResponseSchema = z.array(adminUserOptionSchema);

export const adminManagedUserSchema = z
  .object({
    _id: mongoIdSchema,
    email: z.string().email(),
    name: z.string().default(""),
    admin: z.boolean().default(false),
    isManager: z.boolean().default(false),
    active: z.boolean().default(true),
    manager: z.string().email().optional(),
    department: mongoIdSchema.nullable().optional(),
  })
  .strict();

export const adminManagedUsersResponseSchema = z.array(adminManagedUserSchema);

export const adminUserUpdateBodySchema = z
  .object({
    _id: mongoIdSchema,
    admin: z.boolean(),
    isManager: z.boolean(),
    active: z.boolean(),
    manager: z.string().email().nullable().optional(),
    department: mongoIdSchema.nullable().optional(),
  })
  .strict();

export type PaginationBody = z.infer<typeof paginationBodySchema>;
export type LogActivityBody = z.infer<typeof logActivityBodySchema>;
export type LogDoctorFileBody = z.infer<typeof logDoctorFileBodySchema>;
export type ManualLogsBody = z.infer<typeof manualLogsBodySchema>;
export type MyUserLogsBody = z.infer<typeof myUserLogsBodySchema>;
export type ProjectDedicationInput = z.infer<typeof projectDedicationInputSchema>;
export type WorkerLogsBody = z.infer<typeof workerLogsBodySchema>;
export type WorkerStatsBody = z.infer<typeof workerStatsBodySchema>;
export type UploadUrlQuery = z.infer<typeof uploadUrlQuerySchema>;
export type AuthGoogleProfile = z.infer<typeof authGoogleProfileSchema>;
export type LogActivityResponse = z.infer<typeof logActivityResponseSchema>;
export type LogDoctorFileResponse = z.infer<typeof logDoctorFileResponseSchema>;
export type ManualLogsResponse = z.infer<typeof manualLogsResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type MyUserLogsResponse = z.infer<typeof myUserLogsResponseSchema>;
export type MyProjectDedicationsResponse = z.infer<typeof myProjectDedicationsResponseSchema>;
export type MyUserStatsResponse = z.infer<typeof myUserStatsResponseSchema>;
export type RemoveLastLogResponse = z.infer<typeof removeLastLogResponseSchema>;
export type SetLegalResponse = z.infer<typeof setLegalResponseSchema>;
export type UploadUrlResponse = z.infer<typeof uploadUrlResponseSchema>;
export type UserStatusResponse = z.infer<typeof userStatusResponseSchema>;
export type UserTodayResponse = z.infer<typeof userTodayResponseSchema>;
export type WorkerLogsResponse = z.infer<typeof workerLogsResponseSchema>;
export type WorkerStatsResponse = z.infer<typeof workerStatsResponseSchema>;
export type AllUsersStatusResponse = z.infer<typeof allUsersStatusResponseSchema>;
export type AdminProjectCreateBody = z.infer<typeof adminProjectCreateBodySchema>;
export type AdminProjectUpdateBody = z.infer<typeof adminProjectUpdateBodySchema>;
export type AdminProjectDeleteBody = z.infer<typeof adminProjectDeleteBodySchema>;
export type AdminProjectResponse = z.infer<typeof adminProjectResponseSchema>;
export type AdminProjectsResponse = z.infer<typeof adminProjectsResponseSchema>;
export type AdminDepartmentCreateBody = z.infer<typeof adminDepartmentCreateBodySchema>;
export type AdminDepartmentUpdateBody = z.infer<typeof adminDepartmentUpdateBodySchema>;
export type AdminDepartmentDeleteBody = z.infer<typeof adminDepartmentDeleteBodySchema>;
export type AdminDepartmentOption = z.infer<typeof adminDepartmentOptionSchema>;
export type AdminDepartment = z.infer<typeof adminDepartmentSchema>;
export type AdminDepartmentResponse = z.infer<typeof adminDepartmentResponseSchema>;
export type AdminDepartmentsResponse = z.infer<typeof adminDepartmentsResponseSchema>;
export type AdminDepartmentOptionsResponse = z.infer<
  typeof adminDepartmentOptionsResponseSchema
>;
export type AdminUserOption = z.infer<typeof adminUserOptionSchema>;
export type AdminUsersResponse = z.infer<typeof adminUsersResponseSchema>;
export type AdminManagedUser = z.infer<typeof adminManagedUserSchema>;
export type AdminManagedUsersResponse = z.infer<typeof adminManagedUsersResponseSchema>;
export type AdminUserUpdateBody = z.infer<typeof adminUserUpdateBodySchema>;
