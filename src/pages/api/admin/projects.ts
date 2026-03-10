import getUserByEmail from "@/controllers/getUser";
import { DepartmentModel, ProjectModel, UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import {
  formatZodError,
  isZodError,
  parseWithSchema,
  toPlainObject,
} from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  adminProjectCreateBodySchema,
  adminProjectDeleteBodySchema,
  adminProjectResponseSchema,
  adminProjectsResponseSchema,
  adminProjectUpdateBodySchema,
} from "@/schemas/api";
import { projectCreateSchema } from "@/schemas/db";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

const ensureUsersCanBeAssignedToProjects = async (userIds: string[]) => {
  if (userIds.length === 0) {
    return;
  }

  const users = await UserModel.find({ _id: { $in: userIds } })
    .select("_id department")
    .exec();

  const departmentIds = Array.from(
    new Set(
      users
        .map((user) => user.department?.toString())
        .filter((id): id is string => Boolean(id))
    )
  );

  if (departmentIds.length === 0) {
    return;
  }

  const generalCostDepartments = await DepartmentModel.find({
    _id: { $in: departmentIds },
    costesGenerales: true,
  })
    .select("_id")
    .exec();
  const blockedDepartmentIds = new Set(
    generalCostDepartments.map((department) => department._id.toString())
  );

  const hasBlockedUser = users.some((user) => {
    const departmentId = user.department?.toString();
    return Boolean(departmentId && blockedDepartmentIds.has(departmentId));
  });

  if (hasBlockedUser) {
    throw new Error(
      "No puedes asignar usuarios de departamentos de costes generales a proyectos"
    );
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!["GET", "POST", "PUT", "DELETE"].includes(req.method ?? "")) {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      res.status(401).send("Unauthorized");
      return;
    }

    const me = await getUserByEmail(session.user.email);
    if (!me.admin) {
      res.status(403).send("Forbidden");
      return;
    }

    await connectMongo();

    if (req.method === "GET") {
      const projects = await ProjectModel.find({})
        .sort({ startDate: -1, name: 1 })
        .exec();

      const payload = parseWithSchema(
        adminProjectsResponseSchema,
        toPlainObject(projects)
      );

      res.status(200).json(payload);
      return;
    }

    if (req.method === "POST") {
      const body = parseWithSchema(adminProjectCreateBodySchema, req.body);
      await ensureUsersCanBeAssignedToProjects(body.user);
      const createPayload = parseWithSchema(projectCreateSchema, body);

      const created = await ProjectModel.create(createPayload);
      const payload = parseWithSchema(
        adminProjectResponseSchema,
        toPlainObject(created)
      );

      res.status(201).json(payload);
      return;
    }

    if (req.method === "PUT") {
      const body = parseWithSchema(adminProjectUpdateBodySchema, req.body);
      await ensureUsersCanBeAssignedToProjects(body.user);
      const updatePayload = parseWithSchema(projectCreateSchema, {
        name: body.name,
        startDate: body.startDate,
        endData: body.endData,
        user: body.user,
      });

      const updated = await ProjectModel.findByIdAndUpdate(body._id, updatePayload, {
        new: true,
      }).exec();

      if (!updated) {
        res.status(404).send("Project not found");
        return;
      }

      const payload = parseWithSchema(
        adminProjectResponseSchema,
        toPlainObject(updated)
      );

      res.status(200).json(payload);
      return;
    }

    const body = parseWithSchema(adminProjectDeleteBodySchema, req.body);
    const deleted = await ProjectModel.findByIdAndDelete(body._id).exec();

    if (!deleted) {
      res.status(404).send("Project not found");
      return;
    }

    const payload = parseWithSchema(
      adminProjectResponseSchema,
      toPlainObject(deleted)
    );

    res.status(200).json(payload);
  } catch (error) {
    if (isZodError(error)) {
      res.status(400).send(`Bad Request: ${formatZodError(error)}`);
      return;
    }

    if (error instanceof Error && error.message) {
      res.status(400).send(error.message);
      return;
    }

    res.status(500).end();
  }
};

export default handler;
