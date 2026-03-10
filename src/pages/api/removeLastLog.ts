import removeLastLogOfToday from "@/controllers/removeLastLogOfToday";
import { formatZodError, isZodError, parseWithSchema, toPlainObject } from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { removeLastLogResponseSchema } from "@/schemas/api";
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

    const deletedLog = await removeLastLogOfToday(session.user.email);
    const payload = parseWithSchema(
      removeLastLogResponseSchema,
      toPlainObject(deletedLog)
    );

    res.status(200).json(payload);
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
