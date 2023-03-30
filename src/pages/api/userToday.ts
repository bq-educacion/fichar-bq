import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { LOG_TYPE, USER_STATUS } from "@/types";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const email = session!.user!.email;

    await connectMongo();

    const logsToday = await LogModel.find({
      user: email,
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    });

    if (
      logsToday.some((log) => log.type === USER_STATUS.error) ||
      logsToday.length === 0
    ) {
      res.status(200).json({ hoursToday: 0 });
      res.end();
      return;
    }

    const logsTodayIn = logsToday.filter((log) => log.type === LOG_TYPE.in);
    const logsTodayOut = logsToday.filter(
      (log) => log.type === LOG_TYPE.out || log.type === LOG_TYPE.pause
    );

    if (logsTodayOut.length === 0) {
      logsTodayOut.push({
        date: new Date(),
        type: LOG_TYPE.out,
      });
    }

    if (logsTodayOut.at(-1).date < logsTodayIn.at(-1).date) {
      logsTodayOut.push({
        date: new Date(),
        type: LOG_TYPE.out,
      });
    }

    // sum of todays in
    const sumIn = logsTodayIn.reduce((acc, log) => {
      return acc + log.date.getTime();
    }, 0);

    // sum of todays out
    const sumOut = logsTodayOut.reduce((acc, log) => {
      return acc + log.date.getTime();
    }, 0);

    const hoursToday = (sumOut - sumIn) / 1000 / 60 / 60;

    res.status(200).json({
      hoursToday,
    });

    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};

export default handler;
