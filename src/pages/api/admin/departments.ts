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
  adminDepartmentCreateBodySchema,
  adminDepartmentDeleteBodySchema,
  adminDepartmentOptionSchema,
  adminDepartmentOptionsResponseSchema,
  adminDepartmentResponseSchema,
  adminDepartmentsResponseSchema,
  adminDepartmentUpdateBodySchema,
} from "@/schemas/api";
import { departmentCreateSchema } from "@/schemas/db";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

const normalizeName = (name: string): string => name.trim();

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
      const [departments, usersWithDepartment] = await Promise.all([
        DepartmentModel.find({}).collation({ locale: "es" }).sort({ name: 1 }).exec(),
        UserModel.find({ department: { $exists: true, $ne: null } })
          .collation({ locale: "es" })
          .sort({ name: 1, email: 1 })
          .select("_id email name active department")
          .exec(),
      ]);

      const departmentOptions = parseWithSchema(
        adminDepartmentOptionsResponseSchema,
        toPlainObject(departments)
      );

      const peopleByDepartment = new Map<
        string,
        Array<{ _id: string; email: string; name: string; active: boolean }>
      >();

      for (const user of usersWithDepartment) {
        const departmentId = user.department?.toString();
        if (!departmentId) {
          continue;
        }

        const row = {
          _id: user._id.toString(),
          email: user.email,
          name: user.name ?? "",
          active: Boolean(user.active),
        };

        const current = peopleByDepartment.get(departmentId) ?? [];
        current.push(row);
        peopleByDepartment.set(departmentId, current);
      }

      const payload = parseWithSchema(
        adminDepartmentsResponseSchema,
        departmentOptions.map((department) => ({
          ...department,
          people: peopleByDepartment.get(department._id) ?? [],
        }))
      );

      res.status(200).json(payload);
      return;
    }

    if (req.method === "POST") {
      const body = parseWithSchema(adminDepartmentCreateBodySchema, req.body);
      const createPayload = parseWithSchema(departmentCreateSchema, {
        name: normalizeName(body.name),
      });

      const created = await DepartmentModel.create(createPayload);
      const createdOption = parseWithSchema(
        adminDepartmentOptionSchema,
        toPlainObject(created)
      );
      const department = parseWithSchema(adminDepartmentResponseSchema, {
        ...createdOption,
        people: [],
      });

      res.status(201).json(department);
      return;
    }

    if (req.method === "PUT") {
      const body = parseWithSchema(adminDepartmentUpdateBodySchema, req.body);
      const updatePayload = parseWithSchema(departmentCreateSchema, {
        name: normalizeName(body.name),
      });

      const updated = await DepartmentModel.findByIdAndUpdate(body._id, updatePayload, {
        new: true,
      }).exec();

      if (!updated) {
        res.status(404).send("Department not found");
        return;
      }

      const updatedOption = parseWithSchema(
        adminDepartmentOptionSchema,
        toPlainObject(updated)
      );
      const department = parseWithSchema(adminDepartmentResponseSchema, {
        ...updatedOption,
        people: [],
      });

      res.status(200).json(department);
      return;
    }

    const body = parseWithSchema(adminDepartmentDeleteBodySchema, req.body);
    const assignedUsers = await UserModel.countDocuments({
      department: body._id,
    }).exec();

    if (assignedUsers > 0) {
      res
        .status(400)
        .send("No se puede eliminar un departamento con personas asignadas");
      return;
    }

    const deleted = await DepartmentModel.findByIdAndDelete(body._id).exec();
    if (!deleted) {
      res.status(404).send("Department not found");
      return;
    }

    const deletedOption = parseWithSchema(
      adminDepartmentOptionSchema,
      toPlainObject(deleted)
    );
    const department = parseWithSchema(adminDepartmentResponseSchema, {
      ...deletedOption,
      people: [],
    });

    res.status(200).json(department);
  } catch (error) {
    if (isZodError(error)) {
      res.status(400).send(`Bad Request: ${formatZodError(error)}`);
      return;
    }

    res.status(500).end();
  }
};

export default handler;
