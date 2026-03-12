import {
  deleteTodayLogsExceptFirst,
  getTodayLogs,
  updateTodayLogsTimes,
} from "@/controllers/todayLogs";
import {
  formatZodError,
  isZodError,
  parseWithSchema,
  toPlainObject,
} from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { todayLogsResponseSchema, todayLogsUpdateBodySchema } from "@/schemas/api";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      res.status(401).send("Unauthorized");
      return;
    }

    if (req.method === "GET") {
      const logs = await getTodayLogs(session.user.email);
      const payload = parseWithSchema(todayLogsResponseSchema, toPlainObject(logs));
      res.status(200).json(payload);
      return;
    }

    if (req.method === "PUT") {
      const body = parseWithSchema(todayLogsUpdateBodySchema, req.body);
      const logs = await updateTodayLogsTimes(session.user.email, body);
      const payload = parseWithSchema(todayLogsResponseSchema, toPlainObject(logs));
      res.status(200).json(payload);
      return;
    }

    if (req.method === "DELETE") {
      const logs = await deleteTodayLogsExceptFirst(session.user.email);
      const payload = parseWithSchema(todayLogsResponseSchema, toPlainObject(logs));
      res.status(200).json(payload);
      return;
    }

    res.status(405).send("Method Not Allowed");
  } catch (error) {
    if (isZodError(error)) {
      res.status(400).send(`Bad Request: ${formatZodError(error)}`);
      return;
    }

    if (error instanceof Error && error.message) {
      res.status(400).send(`Bad Request: ${error.message}`);
      return;
    }

    res.status(400).send("Bad Request");
  }
};

export default handler;
