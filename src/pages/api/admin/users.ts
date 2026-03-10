import getUserByEmail from "@/controllers/getUser";
import { DepartmentModel, UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import {
  formatZodError,
  isZodError,
  parseWithSchema,
  toPlainObject,
} from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  adminManagedUserSchema,
  adminManagedUsersResponseSchema,
  adminUserUpdateBodySchema,
  adminUsersResponseSchema,
} from "@/schemas/api";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

const firstQueryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const isTruthyQuery = (value: string | string[] | undefined): boolean => {
  const normalized = firstQueryValue(value)?.toLowerCase();
  return normalized === "1" || normalized === "true";
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!["GET", "PUT"].includes(req.method ?? "")) {
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
      const detailed = isTruthyQuery(req.query.detailed);
      const includeInactive = isTruthyQuery(req.query.includeInactive);
      const filter = includeInactive ? {} : { active: true };

      if (detailed) {
        const users = await UserModel.find(filter)
          .collation({ locale: "es" })
          .sort({ name: 1, email: 1 })
          .select("_id email name admin isManager manager active department")
          .exec();

        const payload = parseWithSchema(
          adminManagedUsersResponseSchema,
          toPlainObject(users)
        );

        res.status(200).json(payload);
        return;
      }

      const users = await UserModel.find(filter)
        .collation({ locale: "es" })
        .sort({ name: 1, email: 1 })
        .select("_id email name")
        .exec();

      const payload = parseWithSchema(adminUsersResponseSchema, toPlainObject(users));

      res.status(200).json(payload);
      return;
    }

    const body = parseWithSchema(adminUserUpdateBodySchema, req.body);
    const target = await UserModel.findById(body._id).exec();
    if (!target) {
      res.status(404).send("User not found");
      return;
    }

    if (target.email === me.email && (!body.admin || !body.active)) {
      res
        .status(400)
        .send("No puedes quitarte privilegios de admin ni desactivarte a ti mismo");
      return;
    }

    const removingManagerRole = target.isManager && !body.isManager;
    const deactivatingManager = target.active && !body.active;
    if (removingManagerRole || deactivatingManager) {
      const assignedWorkers = await UserModel.countDocuments({
        active: true,
        manager: target.email,
      }).exec();

      if (assignedWorkers > 0) {
        res
          .status(400)
          .send("No se puede desactivar o quitar rol manager con usuarios asignados");
        return;
      }
    }

    const managerEmail = body.manager ?? undefined;
    if (managerEmail) {
      if (managerEmail === target.email) {
        res.status(400).send("Un usuario no puede ser su propio responsable");
        return;
      }

      const managerUser = await UserModel.findOne({
        email: managerEmail,
        active: true,
      })
        .select("isManager")
        .exec();

      if (!managerUser) {
        res.status(400).send("El responsable seleccionado no existe o está inactivo");
        return;
      }

      if (!managerUser.isManager) {
        res.status(400).send("El responsable seleccionado no tiene rol manager");
        return;
      }
    }

    if (body.department) {
      const departmentExists = await DepartmentModel.exists({
        _id: body.department,
      }).exec();
      if (!departmentExists) {
        res.status(400).send("El departamento seleccionado no existe");
        return;
      }
    }

    target.admin = body.admin;
    target.isManager = body.isManager;
    target.active = body.active;

    if (managerEmail) {
      target.manager = managerEmail;
    } else {
      target.set("manager", undefined);
    }

    if (body.department === null) {
      target.set("department", undefined);
    } else if (body.department !== undefined) {
      target.department = body.department;
    }

    await target.save();

    const payload = parseWithSchema(
      adminManagedUserSchema,
      toPlainObject({
        _id: target._id,
        email: target.email,
        name: target.name,
        admin: target.admin,
        isManager: target.isManager,
        active: target.active,
        manager: target.manager,
        department: target.department,
      })
    );
    res.status(200).json(payload);
  } catch (error) {
    if (isZodError(error)) {
      res.status(400).send(`Bad Request: ${formatZodError(error)}`);
      return;
    }

    res.status(500).end();
  }
};

export default handler;
