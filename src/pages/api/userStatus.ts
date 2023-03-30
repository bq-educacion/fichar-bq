import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { USER_STATUS } from "@/types";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  const email = session!.user!.email;
  const { type } = req.body;

  await connectMongo();

  const logsOfToday = await LogModel.find({
    user: email,
    date: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
    },
  })
    .sort({ date: -1 })
    .exec();

  // not yet started to work
  if (logsOfToday.length === 0) {
    res.status(200).json({ status: USER_STATUS.not_started });
  } else {
    const lastType = logsOfToday[0].type;

    // if there is any type with USER_STATUS.error
    if (logsOfToday.some((log) => log.type === USER_STATUS.error)) {
      res.status(200).json({ status: USER_STATUS.error });
    } else if (lastType === "in") {
      res.status(200).json({ status: USER_STATUS.working });
    } else if (lastType === "pause") {
      res.status(200).json({ status: USER_STATUS.paused });
    } else {
      res.status(200).json({ status: USER_STATUS.finished });
    }
    res.end();
  }

  res.status(500).end();
};

export default handler;
