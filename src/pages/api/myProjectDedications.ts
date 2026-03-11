import { getProjectDedicationOptionsForDate } from "@/controllers/projectDedications";
import { formatZodError, isZodError, parseWithSchema } from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  myProjectDedicationsQuerySchema,
  myProjectDedicationsResponseSchema,
} from "@/schemas/api";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      res.status(401).send("Unauthorized");
      return;
    }

    const query = parseWithSchema(myProjectDedicationsQuerySchema, {
      targetDate: Array.isArray(req.query.targetDate)
        ? req.query.targetDate[0]
        : req.query.targetDate,
    });

    const data = await getProjectDedicationOptionsForDate(
      session.user.email,
      query.targetDate
    );
    const payload = parseWithSchema(myProjectDedicationsResponseSchema, data);

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
