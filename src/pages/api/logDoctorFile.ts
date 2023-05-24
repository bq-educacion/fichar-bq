import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import getUserByEmail from "@/controllers/getUser";
import connectMongo from "@/lib/connectMongo";
import { LogModel } from "@/db/Models";
import { LOG_NOTES, Log } from "@/types";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    // get logid and logFile from body
    const { _id, logFile } = req.body;

    if (!_id || !logFile) {
      res.status(400).send("Bad Request");
      return;
    }

    connectMongo();
    const log = await LogModel.findById(_id).exec();
    if (!log) {
      res.status(400).send("Bad Request");
      return;
    }

    (log as Log).logFile = logFile;
    (log as Log).note = LOG_NOTES.doctor;
    await log.save();

    res.status(200).json(log);
    res.end();
  } catch (e) {
    res.status(500).end();
  }
};

export default handler;
