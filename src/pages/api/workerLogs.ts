import checkIfManager from "@/controllers/checkeManager";
import getUserLogs from "@/controllers/getUserLogs";
import { formatZodError, isZodError, parseWithSchema, toPlainObject } from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { workerLogsBodySchema, workerLogsResponseSchema } from "@/schemas/api";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user || !session.user.email) {
      res.status(401).send("Unauthorized");
      return;
    }

    const body = parseWithSchema(workerLogsBodySchema, req.body);

    if (!(await checkIfManager(session.user.email, body.workerEmail))) {
      res.status(401).send("Unauthorized");
      return;
    }

    const logs = await getUserLogs(body.workerEmail, body.page, body.numberofdays);
    const payload = parseWithSchema(workerLogsResponseSchema, toPlainObject(logs));

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
