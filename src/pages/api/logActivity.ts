import addLog, { PreviousDayNotClosedError } from "@/controllers/addLog";
import { formatZodError, isZodError, parseWithSchema, toPlainObject } from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  logActivityBodySchema,
  logActivityResponseSchema,
} from "@/schemas/api";
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

    const body = parseWithSchema(logActivityBodySchema, req.body);

    const lastLog = await addLog(
      session.user.email,
      body.type,
      body.isMobile,
      body.projectDedications,
      {
        clientTimezoneOffsetMinutes: body.clientTimezoneOffsetMinutes,
        clientTimeZone: body.clientTimeZone,
      }
    );
    const payload = parseWithSchema(
      logActivityResponseSchema,
      toPlainObject(lastLog)
    );

    res.status(200).json(payload);
  } catch (error) {
    if (error instanceof PreviousDayNotClosedError) {
      res.status(409).json({
        code: "PREVIOUS_DAY_NOT_CLOSED",
        targetDate: error.targetDate,
        message:
          "Ayer dejaste la jornada abierta. Corrige el fichaje manualmente e indica las dedicaciones para poder empezar hoy.",
      });
      return;
    }

    if (isZodError(error)) {
      res.status(400).send(`Bad Request: ${formatZodError(error)}`);
      return;
    }

    res.status(400).send("Bad Request");
  }
};

export default handler;
