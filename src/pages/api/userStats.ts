import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { LOG_TYPE, USER_STATUS } from "@/types";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import {
  logsIn,
  logsOut,
  numberOfDays,
  numberOfErrorLogs,
  removeErrorLogs,
} from "@/lib/utils";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const email = session!.user!.email;

    await connectMongo();

    // how many days have passed since the beginning of the week
    const daysPassedWeek = new Date().getDay();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // all logs of from previous monday until current
    const logsThisWeek = await LogModel.find({
      user: email,
      date: {
        $gte: new Date(
          new Date().setHours(0, 0, 0, 0) - daysPassedWeek * 24 * 60 * 60 * 1000
        ),
        $lt: new Date(),
      },
    });

    // get last index with type error or type out
    let lastErrorOutIndex = -1;
    for (let i = logsThisWeek.length - 1; i >= 0; i--) {
      if (
        logsThisWeek[i].type === LOG_TYPE.error ||
        logsThisWeek[i].type === LOG_TYPE.out
      ) {
        lastErrorOutIndex = i;
        break;
      }
    }

    const realLogsThisWeek = logsThisWeek.slice(0, lastErrorOutIndex + 1);

    // remove logs from days in which there is an error
    const logsThisWeekFiltered = removeErrorLogs(realLogsThisWeek);

    // number of days with error logs this week
    const errorLogsThisWeek = numberOfErrorLogs(realLogsThisWeek);

    // sum date of all logs with type "in"
    const logsThisWeekIn = logsIn(logsThisWeekFiltered);

    // sum date of all logs with type "out" or pause
    const logsThisWeekOut = logsOut(logsThisWeekFiltered);

    // count how many logs of different days there are
    const logsThisWeekDays = numberOfDays(logsThisWeekFiltered);

    // average time worked this week
    const averageThisWeek =
      logsThisWeekDays === 0
        ? 0
        : (logsThisWeekOut - logsThisWeekIn) /
          logsThisWeekDays /
          1000 /
          60 /
          60;

    // totoal hours worked this week
    const totalThisWeek = (logsThisWeekOut - logsThisWeekIn) / 1000 / 60 / 60;

    const logsThisMonth = await LogModel.find({
      user: email,
      date: {
        $gte: new Date(
          new Date(currentYear, currentMonth, 1).setHours(0, 0, 0, 0)
        ),
        $lt: new Date().setHours(0, 0, 0, 0),
      },
    });

    // remove logs from days in which there is an error
    const logsThisMonthFiltered = removeErrorLogs(logsThisMonth);

    // number of days with error logs this month
    const errorLogsThisMonth = numberOfErrorLogs(logsThisMonth);

    // calculate the average for the month
    const logsThisMonthIn = logsIn(logsThisMonthFiltered);
    const logsThisMonthOut = logsOut(logsThisMonthFiltered);
    const logsThisMonthDays = numberOfDays(logsThisMonthFiltered);

    const averageThisMonth =
      logsThisMonthDays === 0
        ? 0
        : (logsThisMonthOut - logsThisMonthIn) /
          logsThisMonthDays /
          1000 /
          60 /
          60;

    const logsThisYear = await LogModel.find({
      user: email,
      date: {
        $gte: new Date(new Date(currentYear, 0, 1).setHours(0, 0, 0, 0)),
        $lt: new Date().setHours(0, 0, 0, 0),
      },
    });

    // remove logs from days in which there is an error
    const logsThisYearFiltered = removeErrorLogs(logsThisYear);

    // number of days with error logs this year
    const errorLogsThisYear = numberOfErrorLogs(logsThisYear);

    // calculate the average for the year
    const logsThisYearIn = logsIn(logsThisYearFiltered);
    const logsThisYearOut = logsOut(logsThisYearFiltered);
    const logsThisYearDays = numberOfDays(logsThisYearFiltered);

    // average time worked this year in hours
    const averageThisYear =
      logsThisYearDays === 0
        ? 0
        : (logsThisYearOut - logsThisYearIn) /
          logsThisYearDays /
          1000 /
          60 /
          60;

    res.status(200).json({
      totalThisWeek,
      averageThisWeek,
      averageThisMonth,
      averageThisYear,
      logsThisYearDays,
      logsThisMonthDays,
      logsThisWeekDays,
      errorLogsThisWeek,
      errorLogsThisMonth,
      errorLogsThisYear,
    });

    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};

export default handler;
