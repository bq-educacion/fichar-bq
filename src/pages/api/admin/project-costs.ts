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
import { adminProjectCostReportQuerySchema } from "@/schemas/projectCosts";
import { NextApiRequest, NextApiResponse } from "next";

const firstQueryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    setNoStoreHeaders(res);

    const me = await requireAdminAuthorization(req, res);
    if (!me) {
      return;
    }

    const query = parseWithSchema(adminProjectCostReportQuerySchema, {
      month: firstQueryValue(req.query.month),
      departmentId: firstQueryValue(req.query.departmentId),
      projectId: firstQueryValue(req.query.projectId),
    });
    const payload = await getAdminProjectCostReport(query);
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
