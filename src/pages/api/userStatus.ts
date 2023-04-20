import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { LOG_TYPE, Log, USER_STATUS } from "@/types";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getHoursToday } from "@/lib/utils";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  const email = session!.user!.email;

  await connectMongo();

  const logsOfToday: Log[] = await LogModel.find({
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
    const lastDate = logsOfToday[0].date;
    const startDate = logsOfToday.at(-1)?.date;
    const hoursToday = getHoursToday(logsOfToday.reverse());

    // if there is any type with USER_STATUS.error
    if (logsOfToday.some((log) => log.type === LOG_TYPE.error)) {
      res.status(200).json({ status: USER_STATUS.error, date: lastDate });
    } else if (lastType === "in") {
      res.status(200).json({
        status: USER_STATUS.working,
        date: lastDate,
        startDate,
        hoursToday,
      });
    } else if (lastType === "pause") {
      res.status(200).json({
        status: USER_STATUS.paused,
        date: lastDate,
        startDate,
        hoursToday,
      });
    } else {
      res.status(200).json({
        status: USER_STATUS.finished,
        date: lastDate,
        startDate,
        hoursToday,
      });
    }
    res.end();
  }

  res.status(500).end();
};

export default handler;
