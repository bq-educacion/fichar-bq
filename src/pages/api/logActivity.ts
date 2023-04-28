import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { LOG_TYPE } from "@/types";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  const email = session.user.email;
  const { type } = req.body;

  await connectMongo();

  if (type === LOG_TYPE.goback) {
    const lastLog = await LogModel.findOne({ user: email })
      .sort({ date: -1 })
      .exec();
    if (!lastLog || lastLog.type !== LOG_TYPE.out) {
      res.status(400).send("Bad Request");
      return;
    }
    lastLog.type = LOG_TYPE.pause;
    await lastLog.save();
    const log = await LogModel.create({
      type: LOG_TYPE.in,
      date: new Date(),
      user: email,
    });
    res.status(200).json(lastLog);
    res.end();
    return;
  }
  const log = await LogModel.create({
    type,
    date: new Date(),
    user: email,
  });

  res.status(200).json(log);
  res.end();
};

export default handler;
