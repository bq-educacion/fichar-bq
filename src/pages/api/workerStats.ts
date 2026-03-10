import checkIfManager from "@/controllers/checkeManager";
import getUserStats from "@/controllers/getUserStats";
import { formatZodError, isZodError, parseWithSchema, toPlainObject } from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { workerStatsBodySchema, workerStatsResponseSchema } from "@/schemas/api";
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

    const body = parseWithSchema(workerStatsBodySchema, req.body);

    if (!(await checkIfManager(session.user.email, body.workerEmail))) {
      res.status(401).send("Unauthorized");
      return;
    }

    const data = await getUserStats(body.workerEmail);
    const payload = parseWithSchema(workerStatsResponseSchema, toPlainObject(data));

    res.status(200).json(payload);
  } catch (error) {
    if (isZodError(error)) {
      res.status(400).send(`Bad Request: ${formatZodError(error)}`);
      return;
    }

    console.error(error);
    res.status(500).end();
  }
};

export default handler;
