import { MonthlyGeneralCostModel } from "@/db/Models";
import { getAdminProjectCostReport } from "@/controllers/getAdminProjectCostReport";
import {
  requireAdminAuthorization,
  setNoStoreHeaders,
} from "@/lib/adminAuthorization";
import {
  formatZodError,
  isZodError,
  parseWithSchema,
} from "@/lib/validation";
import { monthlyGeneralCostCreateSchema } from "@/schemas/db";
import {
  adminProjectCostGeneralCostUpdateBodySchema,
  adminProjectCostReportQuerySchema,
} from "@/schemas/projectCosts";
import { NextApiRequest, NextApiResponse } from "next";

const firstQueryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const toMonthStartDate = (month: string): Date => {
  const [rawYear, rawMonth] = month.split("-");
  const year = Number(rawYear);
  const monthIndex = Number(rawMonth) - 1;
  return new Date(year, monthIndex, 1, 0, 0, 0, 0);
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!["GET", "PUT"].includes(req.method ?? "")) {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    setNoStoreHeaders(res);

    const me = await requireAdminAuthorization(req, res);
    if (!me) {
      return;
    }

    if (req.method === "GET") {
      const query = parseWithSchema(adminProjectCostReportQuerySchema, {
        month: firstQueryValue(req.query.month),
        departmentId: firstQueryValue(req.query.departmentId),
        projectId: firstQueryValue(req.query.projectId),
      });
      const payload = await getAdminProjectCostReport(query);
      res.status(200).json(payload);
      return;
    }

    const body = parseWithSchema(adminProjectCostGeneralCostUpdateBodySchema, req.body);
    const month = toMonthStartDate(body.month);
    const payload = parseWithSchema(monthlyGeneralCostCreateSchema, {
      month,
      amount: body.amount,
    });

    if (payload.amount === 0) {
      await MonthlyGeneralCostModel.findOneAndDelete({ month: payload.month }).exec();
    } else {
      await MonthlyGeneralCostModel.findOneAndUpdate(
        { month: payload.month },
        { $set: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).exec();
    }

    res.status(200).json({
      month: body.month,
      amount: body.amount,
    });
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
