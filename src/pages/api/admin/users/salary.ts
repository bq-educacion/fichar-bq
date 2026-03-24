import { UserModel } from "@/db/Models";
import {
  requireAdminAuthorization,
  setNoStoreHeaders,
} from "@/lib/adminAuthorization";
import {
  appendSalaryToUserHistory,
  getCurrentSalaryEntryFromUser,
} from "@/lib/userSalary";
import {
  formatZodError,
  isZodError,
  parseWithSchema,
  toPlainObject,
} from "@/lib/validation";
import {
  adminUserSalaryQuerySchema,
  adminUserSalaryResponseSchema,
  adminUserSalaryUpdateBodySchema,
} from "@/schemas/api";
import { NextApiRequest, NextApiResponse } from "next";

const firstQueryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const toSalaryDate = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

const toDateOnlyString = (value: Date | null): string | null =>
  value ? value.toISOString().slice(0, 10) : null;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!["GET", "PUT"].includes(req.method ?? "")) {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    setNoStoreHeaders(res);

    const authorizedUser = await requireAdminAuthorization(req, res, {
      requireSuperadmin: true,
    });
    if (!authorizedUser) {
      return;
    }

    if (req.method === "GET") {
      const query = parseWithSchema(adminUserSalaryQuerySchema, {
        userId: firstQueryValue(req.query.userId),
      });
      const target = await UserModel.findById(query.userId)
        .select("_id +salaryHistory")
        .exec();

      if (!target) {
        res.status(404).send("User not found");
        return;
      }

      const currentSalaryEntry = getCurrentSalaryEntryFromUser(target);
      const payload = parseWithSchema(
        adminUserSalaryResponseSchema,
        toPlainObject({
          _id: target._id,
          salary: currentSalaryEntry?.salary ?? null,
          initDate: toDateOnlyString(currentSalaryEntry?.initDate ?? null),
        })
      );

      res.status(200).json(payload);
      return;
    }

    const body = parseWithSchema(adminUserSalaryUpdateBodySchema, req.body);
    const target = await UserModel.findById(body._id)
      .select("_id +salaryHistory")
      .exec();

    if (!target) {
      res.status(404).send("User not found");
      return;
    }

    const changed = appendSalaryToUserHistory(
      target,
      body.salary,
      toSalaryDate(body.initDate)
    );
    if (changed) {
      await target.save();
    }

    const currentSalaryEntry = getCurrentSalaryEntryFromUser(target);
    const payload = parseWithSchema(
      adminUserSalaryResponseSchema,
      toPlainObject({
        _id: target._id,
        salary: currentSalaryEntry?.salary ?? null,
        initDate: toDateOnlyString(currentSalaryEntry?.initDate ?? null),
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
