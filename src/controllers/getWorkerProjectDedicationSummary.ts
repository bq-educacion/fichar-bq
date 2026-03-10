import { ProjectDedicationModel, ProjectModel, UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import {
  dateSchema,
  dedicationPercentageSchema,
  mongoIdLikeSchema,
  mongoIdSchema,
} from "@/schemas/db";
import { z } from "zod";

const DAY_MS = 24 * 60 * 60 * 1000;

const workerEmailSchema = z.string().email();

const projectDedicationDocSchema = z
  .object({
    date: dateSchema,
    dedications: z
      .array(
        z
          .object({
            projectId: mongoIdLikeSchema,
            dedication: dedicationPercentageSchema,
          })
          .strict()
      )
      .default([]),
  })
  .strict();

const projectNameDocSchema = z
  .object({
    _id: mongoIdLikeSchema,
    name: z.string().min(1),
  })
  .strict();

const workerProjectDedicationSummaryRowSchema = z
  .object({
    projectId: mongoIdSchema,
    projectName: z.string().min(1),
    thisWeek: z.number().min(0),
    previousWeek: z.number().min(0),
    thisMonth: z.number().min(0),
  })
  .strict();

export const workerProjectDedicationSummarySchema = z
  .object({
    thisWeekDaysElapsed: z.number().int().min(1),
    previousWeekDays: z.number().int().min(1),
    thisMonthDaysElapsed: z.number().int().min(1),
    rows: z.array(workerProjectDedicationSummaryRowSchema),
  })
  .strict();

export type WorkerProjectDedicationSummary = z.infer<
  typeof workerProjectDedicationSummarySchema
>;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const startOfWeekMonday = (date: Date) => {
  const day = date.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = startOfDay(date);
  monday.setDate(monday.getDate() - daysFromMonday);
  return monday;
};

const daysBetweenInclusive = (start: Date, end: Date) => {
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((utcEnd - utcStart) / DAY_MS) + 1;
};

const isWithinRange = (date: Date, start: Date, end: Date) =>
  date.getTime() >= start.getTime() && date.getTime() <= end.getTime();

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;

const getWorkerProjectDedicationSummary = async (
  workerEmail: string
): Promise<WorkerProjectDedicationSummary> => {
  const parsedEmail = parseWithSchema(workerEmailSchema, workerEmail);

  await connectMongo();

  const worker = await UserModel.findOne({ email: parsedEmail }).select("_id").exec();
  if (!worker) {
    throw new Error("Worker not found");
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const thisWeekStart = startOfWeekMonday(todayStart);
  const previousWeekStart = new Date(thisWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(thisWeekStart.getTime() - 1);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisWeekDaysElapsed = daysBetweenInclusive(thisWeekStart, todayStart);
  const previousWeekDays = 7;
  const thisMonthDaysElapsed = daysBetweenInclusive(thisMonthStart, todayStart);

  const earliestDate = new Date(
    Math.min(previousWeekStart.getTime(), thisMonthStart.getTime())
  );

  const docsRaw = await ProjectDedicationModel.find({
    userId: worker._id,
    date: { $gte: earliestDate, $lte: todayEnd },
  })
    .select("date dedications -_id")
    .exec();

  const docs = parseWithSchema(
    z.array(projectDedicationDocSchema),
    toPlainObject(docsRaw)
  );

  const totalsByProject = new Map<
    string,
    { thisWeek: number; previousWeek: number; thisMonth: number }
  >();

  for (const doc of docs) {
    const docDate = startOfDay(new Date(doc.date));
    const inThisWeek = isWithinRange(docDate, thisWeekStart, todayEnd);
    const inPreviousWeek = isWithinRange(docDate, previousWeekStart, previousWeekEnd);
    const inThisMonth = isWithinRange(docDate, thisMonthStart, todayEnd);

    if (!inThisWeek && !inPreviousWeek && !inThisMonth) {
      continue;
    }

    for (const dedication of doc.dedications) {
      const projectId = dedication.projectId.toString();
      const currentTotals = totalsByProject.get(projectId) ?? {
        thisWeek: 0,
        previousWeek: 0,
        thisMonth: 0,
      };

      if (inThisWeek) {
        currentTotals.thisWeek += dedication.dedication;
      }
      if (inPreviousWeek) {
        currentTotals.previousWeek += dedication.dedication;
      }
      if (inThisMonth) {
        currentTotals.thisMonth += dedication.dedication;
      }

      totalsByProject.set(projectId, currentTotals);
    }
  }

  const projectIds = Array.from(totalsByProject.keys());

  const projectDocsRaw =
    projectIds.length === 0
      ? []
      : await ProjectModel.find({ _id: { $in: projectIds } })
          .select("_id name")
          .exec();

  const projects = parseWithSchema(
    z.array(projectNameDocSchema),
    toPlainObject(projectDocsRaw)
  );
  const nameByProjectId = new Map(
    projects.map((project) => [project._id.toString(), project.name] as const)
  );

  const rows = projectIds
    .map((projectId) => {
      const totals = totalsByProject.get(projectId)!;
      return {
        projectId,
        projectName: nameByProjectId.get(projectId) ?? "Proyecto eliminado",
        thisWeek: roundToOneDecimal(totals.thisWeek / thisWeekDaysElapsed),
        previousWeek: roundToOneDecimal(totals.previousWeek / previousWeekDays),
        thisMonth: roundToOneDecimal(totals.thisMonth / thisMonthDaysElapsed),
      };
    })
    .sort((a, b) => a.projectName.localeCompare(b.projectName, "es"));

  return parseWithSchema(workerProjectDedicationSummarySchema, {
    thisWeekDaysElapsed,
    previousWeekDays,
    thisMonthDaysElapsed,
    rows,
  });
};

export default getWorkerProjectDedicationSummary;
