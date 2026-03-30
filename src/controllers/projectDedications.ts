import { DepartmentModel, ProjectDedicationModel, ProjectModel, UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import {
  myProjectDedicationProjectSchema,
  myProjectDedicationsResponseSchema,
  projectDedicationInputSchema,
  ProjectDedicationInput,
  yyyyMmDdSchema,
} from "@/schemas/api";
import { projectDedicationCreateSchema } from "@/schemas/db";
import { z } from "zod";

import {
  type ClientTimeInput,
  getUtcRangeForLocalDate,
  parseYyyyMmDdToLocalDate,
  resolveClientTimeContext,
} from "@/lib/clientTime";

const dedicationArraySchema = z.array(projectDedicationInputSchema).default([]);
const emailSchema = z.string().email();
const dayRangeSchema = z
  .object({
    start: z.date(),
    end: z.date(),
  })
  .strict()
  .refine((value) => value.start.getTime() <= value.end.getTime(), {
    message: "Invalid day range",
  });

const getRangeFromInputDate = (
  clientTimeInput: ClientTimeInput = {},
  targetDate?: string
) => {
  const context = resolveClientTimeContext(clientTimeInput);
  const targetLocalDate = targetDate
    ? parseYyyyMmDdToLocalDate(targetDate)
    : context.nowLocalDate;

  const range = getUtcRangeForLocalDate(context, targetLocalDate);
  return { start: range.startUtc, end: range.endUtc };
};

const getUserContextFromEmail = async (
  email: string
): Promise<{ userId: string; isGeneralCostsDepartment: boolean }> => {
  const parsedEmail = parseWithSchema(emailSchema, email);
  const user = await UserModel.findOne({ email: parsedEmail })
    .select("_id department")
    .exec();
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.department) {
    return {
      userId: user._id.toString(),
      isGeneralCostsDepartment: false,
    };
  }

  const department = await DepartmentModel.findById(user.department)
    .select("costesGenerales")
    .exec();

  return {
    userId: user._id.toString(),
    isGeneralCostsDepartment: Boolean(department?.costesGenerales),
  };
};

const getActiveAssignedProjects = async (
  userId: string,
  range: { start: Date; end: Date }
): Promise<Array<{ _id: string; name: string }>> => {
  const parsedRange = parseWithSchema(dayRangeSchema, range);

  const projects = await ProjectModel.find({
    user: userId,
    startDate: { $lte: parsedRange.end },
    endData: { $gte: parsedRange.start },
  })
    .collation({ locale: "es" })
    .sort({ name: 1 })
    .select("_id name")
    .exec();

  return parseWithSchema(
    z.array(myProjectDedicationProjectSchema),
    toPlainObject(projects)
  );
};

const normalizeDedications = (
  dedications: ProjectDedicationInput[]
): ProjectDedicationInput[] => {
  const parsed = parseWithSchema(dedicationArraySchema, dedications);
  const unique = new Map<string, number>();

  for (const item of parsed) {
    if (unique.has(item.projectId)) {
      throw new Error("Hay proyectos repetidos en la dedicación");
    }
    unique.set(item.projectId, item.dedication);
  }

  const normalized: ProjectDedicationInput[] = [];
  unique.forEach((dedication, projectId) => {
    normalized.push({ projectId, dedication });
  });
  return normalized;
};

export const resolveDedicationsForProjects = (
  dedications: ProjectDedicationInput[],
  assignedProjects: Array<{ _id: string; name: string }>
): ProjectDedicationInput[] => {
  if (assignedProjects.length === 0) {
    if (dedications.length > 0) {
      throw new Error("No tienes proyectos activos asignados hoy");
    }
    return [];
  }

  if (assignedProjects.length === 1) {
    return [{ projectId: assignedProjects[0]._id, dedication: 100 }];
  }

  if (dedications.length !== assignedProjects.length) {
    throw new Error("Debes indicar dedicación para todos tus proyectos asignados");
  }

  const assignedIds = new Set(assignedProjects.map((project) => project._id));
  const dedicationIds = new Set(dedications.map((item) => item.projectId));

  if (assignedIds.size !== dedicationIds.size) {
    throw new Error("Debes indicar dedicación para todos tus proyectos asignados");
  }

  dedicationIds.forEach((projectId) => {
    if (!assignedIds.has(projectId)) {
      throw new Error("Solo puedes asignar dedicación a proyectos activos asignados");
    }
  });

  assignedIds.forEach((projectId) => {
    if (!dedicationIds.has(projectId)) {
      throw new Error("Debes indicar dedicación para todos tus proyectos asignados");
    }
  });

  const total = dedications.reduce((acc, item) => acc + item.dedication, 0);
  if (total !== 100) {
    throw new Error("La dedicación total debe sumar 100%");
  }

  return dedications;
};

export const getProjectDedicationOptionsForDate = async (
  email: string,
  targetDate?: string,
  clientTimeInput: ClientTimeInput = {}
) => {
  const parsedEmail = parseWithSchema(emailSchema, email);
  const targetRange = getRangeFromInputDate(clientTimeInput, targetDate);

  await connectMongo();

  const { userId, isGeneralCostsDepartment } =
    await getUserContextFromEmail(parsedEmail);

  if (isGeneralCostsDepartment) {
    return parseWithSchema(myProjectDedicationsResponseSchema, {
      showDedications: false,
      projects: [],
      existingDedications: [],
    });
  }

  const projects = await getActiveAssignedProjects(userId, targetRange);
  if (projects.length === 1) {
    return parseWithSchema(myProjectDedicationsResponseSchema, {
      showDedications: false,
      projects,
      existingDedications: [{ projectId: projects[0]._id, dedication: 100 }],
    });
  }

  const projectIds = new Set(projects.map((project) => project._id));
  const { start, end } = targetRange;

  const existingDoc = await ProjectDedicationModel.findOne({
    userId,
    date: { $gte: start, $lte: end },
  })
    .select("dedications")
    .exec();

  const rawExisting = parseWithSchema(
    z
      .array(
        z
          .object({
            projectId: z.any(),
            dedication: z.number(),
          })
          .strict()
      )
      .default([]),
    toPlainObject(existingDoc?.dedications ?? [])
  );

  const existingDedications = parseWithSchema(
    dedicationArraySchema,
    rawExisting
      .map((item) => ({
        projectId: item.projectId.toString(),
        dedication: item.dedication,
      }))
      .filter(
        (item) =>
          projectIds.has(item.projectId) &&
          Number.isInteger(item.dedication) &&
          item.dedication >= 0 &&
          item.dedication <= 100 &&
          item.dedication % 10 === 0
      )
  );

  return parseWithSchema(myProjectDedicationsResponseSchema, {
    showDedications: true,
    projects,
    existingDedications,
  });
};

export const getProjectDedicationOptionsForToday = async (
  email: string,
  clientTimeInput: ClientTimeInput = {}
) => await getProjectDedicationOptionsForDate(email, undefined, clientTimeInput);

export const saveProjectDedicationsForToday = async (
  email: string,
  dedications: ProjectDedicationInput[],
  clientTimeInput: ClientTimeInput = {}
) => {
  const todayRange = getRangeFromInputDate(clientTimeInput);
  await saveProjectDedicationsForRange(email, dedications, todayRange);
};

export const saveProjectDedicationsForRange = async (
  email: string,
  dedications: ProjectDedicationInput[],
  range: { start: Date; end: Date }
) => {
  const parsedEmail = parseWithSchema(emailSchema, email);
  const normalized = normalizeDedications(dedications);
  const parsedRange = parseWithSchema(dayRangeSchema, range);

  await connectMongo();

  const { userId, isGeneralCostsDepartment } =
    await getUserContextFromEmail(parsedEmail);

  if (isGeneralCostsDepartment) {
    await ProjectDedicationModel.deleteMany({
      userId,
      date: { $gte: parsedRange.start, $lte: parsedRange.end },
    }).exec();
    return;
  }

  const projects = await getActiveAssignedProjects(userId, parsedRange);
  const dedicationsToPersist = resolveDedicationsForProjects(normalized, projects);

  if (dedicationsToPersist.length === 0) {
    await ProjectDedicationModel.deleteMany({
      userId,
      date: { $gte: parsedRange.start, $lte: parsedRange.end },
    }).exec();
    return;
  }

  const payload = parseWithSchema(projectDedicationCreateSchema, {
    date: parsedRange.start,
    userId,
    dedications: dedicationsToPersist,
  });

  await ProjectDedicationModel.findOneAndUpdate(
    { userId: payload.userId, date: payload.date },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec();
};

export const clearProjectDedicationsForToday = async (
  email: string,
  clientTimeInput: ClientTimeInput = {}
) => {
  const parsedEmail = parseWithSchema(emailSchema, email);

  await connectMongo();

  const { userId } = await getUserContextFromEmail(parsedEmail);
  const { start, end } = getRangeFromInputDate(clientTimeInput);

  await ProjectDedicationModel.deleteMany({
    userId,
    date: { $gte: start, $lte: end },
  }).exec();
};
