import { ProjectDedicationModel, ProjectModel, UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import {
  myProjectDedicationProjectSchema,
  myProjectDedicationsResponseSchema,
  projectDedicationInputSchema,
  ProjectDedicationInput,
} from "@/schemas/api";
import { projectDedicationCreateSchema } from "@/schemas/db";
import { z } from "zod";

const dedicationArraySchema = z.array(projectDedicationInputSchema).default([]);
const emailSchema = z.string().email();

const getTodayRange = () => {
  const start = new Date(new Date().setHours(0, 0, 0, 0));
  const end = new Date(new Date().setHours(23, 59, 59, 999));
  return { start, end };
};

const getUserIdFromEmail = async (email: string): Promise<string> => {
  const parsedEmail = parseWithSchema(emailSchema, email);
  const user = await UserModel.findOne({ email: parsedEmail }).select("_id").exec();
  if (!user) {
    throw new Error("User not found");
  }
  return user._id.toString();
};

const getActiveAssignedProjects = async (
  userId: string
): Promise<Array<{ _id: string; name: string }>> => {
  const { start, end } = getTodayRange();

  const projects = await ProjectModel.find({
    user: userId,
    startDate: { $lte: end },
    endData: { $gte: start },
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

const validateDedicationsForProjects = (
  dedications: ProjectDedicationInput[],
  assignedProjects: Array<{ _id: string; name: string }>
) => {
  if (assignedProjects.length === 0) {
    if (dedications.length > 0) {
      throw new Error("No tienes proyectos activos asignados hoy");
    }
    return;
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
};

export const getProjectDedicationOptionsForToday = async (email: string) => {
  const parsedEmail = parseWithSchema(emailSchema, email);

  await connectMongo();

  const userId = await getUserIdFromEmail(parsedEmail);
  const projects = await getActiveAssignedProjects(userId);
  const projectIds = new Set(projects.map((project) => project._id));
  const { start, end } = getTodayRange();

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
    projects,
    existingDedications,
  });
};

export const saveProjectDedicationsForToday = async (
  email: string,
  dedications: ProjectDedicationInput[]
) => {
  const parsedEmail = parseWithSchema(emailSchema, email);
  const normalized = normalizeDedications(dedications);

  await connectMongo();

  const userId = await getUserIdFromEmail(parsedEmail);
  const projects = await getActiveAssignedProjects(userId);
  validateDedicationsForProjects(normalized, projects);

  const { start, end } = getTodayRange();

  if (normalized.length === 0) {
    await ProjectDedicationModel.deleteMany({
      userId,
      date: { $gte: start, $lte: end },
    }).exec();
    return;
  }

  const payload = parseWithSchema(projectDedicationCreateSchema, {
    date: start,
    userId,
    dedications: normalized,
  });

  await ProjectDedicationModel.findOneAndUpdate(
    { userId: payload.userId, date: payload.date },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec();
};

export const clearProjectDedicationsForToday = async (email: string) => {
  const parsedEmail = parseWithSchema(emailSchema, email);

  await connectMongo();

  const userId = await getUserIdFromEmail(parsedEmail);
  const { start, end } = getTodayRange();

  await ProjectDedicationModel.deleteMany({
    userId,
    date: { $gte: start, $lte: end },
  }).exec();
};
