import { z } from "zod";

export const yyyyMmSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Invalid YYYY-MM format");

export const adminProjectCostReportQuerySchema = z
  .object({
    month: yyyyMmSchema,
    departmentId: z.string().min(1).optional(),
    projectId: z.string().min(1).optional(),
  })
  .strict();

export const projectCostFilterOptionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
  })
  .strict();

export const projectCostDetailItemSchema = z
  .object({
    kind: z.enum(["user"]),
    label: z.string().min(1),
    userId: z.string().nullable(),
    userName: z.string().nullable(),
    departmentId: z.string().min(1),
    departmentName: z.string().min(1),
    projectId: z.string().nullable(),
    projectName: z.string().nullable(),
    allocationPercentage: z.number().nullable(),
    assignedMonthlyCost: z.number(),
    warning: z.string().nullable(),
  })
  .strict();

export const projectCostCellSchema = z
  .object({
    baseCost: z.number(),
    finalCost: z.number(),
    allocatedGeneralCost: z.number(),
    details: z.array(projectCostDetailItemSchema),
    warnings: z.array(z.string()),
  })
  .strict();

export const projectCostProjectCellSchema = projectCostCellSchema
  .extend({
    projectId: z.string().min(1),
    projectName: z.string().min(1),
  })
  .strict();

export const projectCostRowSchema = z
  .object({
    departmentId: z.string().min(1),
    departmentName: z.string().min(1),
    isGeneralCostsDepartment: z.boolean(),
    isSynthetic: z.boolean(),
    projects: z.array(projectCostProjectCellSchema),
    totalBase: z.number(),
    totalFinal: z.number(),
  })
  .strict();

export const projectCostTotalsSchema = z
  .object({
    projects: z.array(projectCostProjectCellSchema),
    totalBase: z.number(),
    totalFinal: z.number(),
  })
  .strict();

export const projectCostSummarySchema = z
  .object({
    totalPersonnelCost: z.number(),
    totalGeneralCosts: z.number(),
    totalFinalCost: z.number(),
    activeProjects: z.number().int().min(0),
  })
  .strict();

export const projectCostChartPointSchema = z
  .object({
    month: yyyyMmSchema,
    baseCost: z.number(),
    finalCost: z.number(),
  })
  .strict();

export const projectCostChartSeriesSchema = z
  .object({
    projectId: z.string().min(1),
    projectName: z.string().min(1),
    points: z.array(projectCostChartPointSchema),
  })
  .strict();

export const adminProjectCostReportResponseSchema = z
  .object({
    month: yyyyMmSchema,
    filters: z
      .object({
        selectedDepartmentId: z.string().nullable(),
        selectedProjectId: z.string().nullable(),
        departments: z.array(projectCostFilterOptionSchema),
        projects: z.array(projectCostFilterOptionSchema),
      })
      .strict(),
    rows: z.array(projectCostRowSchema),
    projects: z.array(
      z
        .object({
          projectId: z.string().min(1),
          projectName: z.string().min(1),
        })
        .strict()
    ),
    totals: projectCostTotalsSchema,
    summaries: z
      .object({
        base: projectCostSummarySchema,
        final: projectCostSummarySchema,
      })
      .strict(),
    chart: z.array(projectCostChartSeriesSchema),
    developerNote: z.array(z.string().min(1)),
  })
  .strict();

export type YyyyMm = z.infer<typeof yyyyMmSchema>;
export type AdminProjectCostReportQuery = z.infer<
  typeof adminProjectCostReportQuerySchema
>;
export type ProjectCostFilterOption = z.infer<typeof projectCostFilterOptionSchema>;
export type ProjectCostDetailItemResponse = z.infer<typeof projectCostDetailItemSchema>;
export type ProjectCostCellResponse = z.infer<typeof projectCostCellSchema>;
export type ProjectCostProjectCellResponse = z.infer<typeof projectCostProjectCellSchema>;
export type ProjectCostRowResponse = z.infer<typeof projectCostRowSchema>;
export type ProjectCostTotalsResponse = z.infer<typeof projectCostTotalsSchema>;
export type ProjectCostSummaryResponse = z.infer<typeof projectCostSummarySchema>;
export type ProjectCostChartSeriesResponse = z.infer<typeof projectCostChartSeriesSchema>;
export type AdminProjectCostReportResponse = z.infer<
  typeof adminProjectCostReportResponseSchema
>;
