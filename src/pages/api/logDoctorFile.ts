import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { formatZodError, isZodError, parseWithSchema, toPlainObject } from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  logDoctorFileBodySchema,
  logDoctorFileResponseSchema,
} from "@/schemas/api";
import { LOG_NOTES } from "@/types";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const body = parseWithSchema(logDoctorFileBodySchema, req.body);

    await connectMongo();
    const log = await LogModel.findById(body._id).exec();
    if (!log) {
      res.status(400).send("Bad Request");
      return;
    }

    log.logFile = body.logFile;
    log.note = LOG_NOTES.doctor;
    await log.save();

    const payload = parseWithSchema(
      logDoctorFileResponseSchema,
      toPlainObject(log)
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
