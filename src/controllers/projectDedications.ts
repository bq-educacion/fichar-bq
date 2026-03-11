import { DepartmentModel, ProjectDedicationModel, ProjectModel, UserModel } from "@/db/Models";
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

export const getProjectDedicationOptionsForToday = async (email: string) => {
  const parsedEmail = parseWithSchema(emailSchema, email);

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

  const projects = await getActiveAssignedProjects(userId);
  if (projects.length === 1) {
    return parseWithSchema(myProjectDedicationsResponseSchema, {
      showDedications: false,
      projects,
      existingDedications: [{ projectId: projects[0]._id, dedication: 100 }],
    });
  }

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
    showDedications: true,
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

  const { userId, isGeneralCostsDepartment } =
    await getUserContextFromEmail(parsedEmail);
  const { start, end } = getTodayRange();

  if (isGeneralCostsDepartment) {
    await ProjectDedicationModel.deleteMany({
      userId,
      date: { $gte: start, $lte: end },
    }).exec();
    return;
  }

  const projects = await getActiveAssignedProjects(userId);
  const dedicationsToPersist = resolveDedicationsForProjects(normalized, projects);

  if (dedicationsToPersist.length === 0) {
    await ProjectDedicationModel.deleteMany({
      userId,
      date: { $gte: start, $lte: end },
    }).exec();
    return;
  }

  const payload = parseWithSchema(projectDedicationCreateSchema, {
    date: start,
    userId,
    dedications: dedicationsToPersist,
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

  const { userId } = await getUserContextFromEmail(parsedEmail);
  const { start, end } = getTodayRange();

  await ProjectDedicationModel.deleteMany({
    userId,
    date: { $gte: start, $lte: end },
  }).exec();
};
