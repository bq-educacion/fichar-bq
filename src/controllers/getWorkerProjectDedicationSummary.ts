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
    thisWeekDaysElapsed: z.number().int().min(0),
    previousWeekDays: z.number().int().min(0),
    thisMonthDaysElapsed: z.number().int().min(0),
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

const isWithinRange = (date: Date, start: Date, end: Date) =>
  date.getTime() >= start.getTime() && date.getTime() <= end.getTime();

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const averageByLoggedDays = (total: number, loggedDays: number) =>
  loggedDays === 0 ? 0 : total / loggedDays;

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

  const thisWeekDays = new Set<string>();
  const previousWeekDays = new Set<string>();
  const thisMonthDays = new Set<string>();

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

    if (doc.dedications.length > 0) {
      const key = dayKey(docDate);
      if (inThisWeek) {
        thisWeekDays.add(key);
      }
      if (inPreviousWeek) {
        previousWeekDays.add(key);
      }
      if (inThisMonth) {
        thisMonthDays.add(key);
      }
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
        thisWeek: roundToOneDecimal(
          averageByLoggedDays(totals.thisWeek, thisWeekDays.size)
        ),
        previousWeek: roundToOneDecimal(
          averageByLoggedDays(totals.previousWeek, previousWeekDays.size)
        ),
        thisMonth: roundToOneDecimal(
          averageByLoggedDays(totals.thisMonth, thisMonthDays.size)
        ),
      };
    })
    .sort((a, b) => a.projectName.localeCompare(b.projectName, "es"));

  return parseWithSchema(workerProjectDedicationSummarySchema, {
    thisWeekDaysElapsed: thisWeekDays.size,
    previousWeekDays: previousWeekDays.size,
    thisMonthDaysElapsed: thisMonthDays.size,
    rows,
  });
};

export default getWorkerProjectDedicationSummary;
