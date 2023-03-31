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
        $lt: new Date().setHours(0, 0, 0, 0),
      },
    });

    // remove logs from days in which there is an error
    const logsThisWeekFiltered = logsThisWeek.filter((log) => {
      const date = new Date(log.date).setHours(0, 0, 0, 0);
      const logsThisDay = logsThisWeek.filter(
        (log) => new Date(log.date).setHours(0, 0, 0, 0) === date
      );
      return !logsThisDay.some((log) => log.type === LOG_TYPE.error);
    });

    // number of days with error logs this week
    const errorLogsThisWeek = await LogModel.find({
      user: email,
      type: LOG_TYPE.error,
      date: {
        $gte: new Date(
          new Date().setHours(0, 0, 0, 0) - daysPassedWeek * 24 * 60 * 60 * 1000
        ),
      },
    }).countDocuments();

    // sum date of all logs with type "in"
    const logsThisWeekIn = logsThisWeekFiltered
      .filter((log) => log.type === LOG_TYPE.in)
      .reduce((acc, log) => acc + log.date.getTime(), 0);

    // sum date of all logs with type "out" or pause
    const logsThisWeekOut = logsThisWeekFiltered
      .filter((log) => log.type === LOG_TYPE.out || log.type === LOG_TYPE.pause)
      .reduce((acc, log) => acc + log.date.getTime(), 0);

    // count how many logs of different days there are
    const logsThisWeekDays = logsThisWeekFiltered.reduce((acc, log) => {
      const date = new Date(log.date).setHours(0, 0, 0, 0);
      if (!acc.includes(date)) {
        acc.push(date);
      }
      return acc;
    }, []).length;

    // average time worked this week
    const averageThisWeek =
      logsThisWeekDays === 0
        ? 0
        : (logsThisWeekOut - logsThisWeekIn) /
          logsThisWeekDays /
          1000 /
          60 /
          60;

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
    const logsThisMonthFiltered = logsThisMonth.filter((log) => {
      const date = new Date(log.date).setHours(0, 0, 0, 0);
      const logsThisDate = logsThisMonth.filter(
        (log) => new Date(log.date).setHours(0, 0, 0, 0) === date
      );
      return !logsThisDate.some((log) => log.type === LOG_TYPE.error);
    });

    // number of days with error logs this month
    const errorLogsThisMonth = await LogModel.find({
      user: email,
      type: LOG_TYPE.error,
      date: {
        $gte: new Date(
          new Date(currentYear, currentMonth, 1).setHours(0, 0, 0, 0)
        ),
      },
    }).countDocuments();

    // calculate the average for the month
    const logsThisMonthIn = logsThisMonthFiltered
      .filter((log) => log.type === LOG_TYPE.in)
      .reduce((acc, log) => acc + log.date.getTime(), 0);

    const logsThisMonthOut = logsThisMonthFiltered
      .filter((log) => log.type === LOG_TYPE.out || log.type === LOG_TYPE.pause)
      .reduce((acc, log) => acc + log.date.getTime(), 0);

    const logsThisMonthDays = logsThisMonthFiltered.reduce((acc, log) => {
      const date = new Date(log.date).setHours(0, 0, 0, 0);
      if (!acc.includes(date)) {
        acc.push(date);
      }
      return acc;
    }, []).length;

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
    const logsThisYearFiltered = logsThisYear.filter((log) => {
      const date = new Date(log.date).setHours(0, 0, 0, 0);
      const logsThisDay = logsThisYear.filter(
        (log) => new Date(log.date).setHours(0, 0, 0, 0) === date
      );
      return !logsThisDay.some((log) => log.type === LOG_TYPE.error);
    });

    // number of days with error logs this year
    const errorLogsThisYear = await LogModel.find({
      user: email,
      type: LOG_TYPE.error,
      date: {
        $gte: new Date(new Date(currentYear, 0, 1).setHours(0, 0, 0, 0)),
      },
    }).countDocuments();

    // calculate the average for the year
    const logsThisYearIn = logsThisYearFiltered
      .filter((log) => log.type === LOG_TYPE.in)
      .reduce((acc, log) => acc + log.date.getTime(), 0);

    const logsThisYearOut = logsThisYearFiltered
      .filter((log) => log.type === LOG_TYPE.out || log.type === LOG_TYPE.pause)
      .reduce((acc, log) => acc + log.date.getTime(), 0);

    const logsThisYearDays = logsThisYearFiltered.reduce((acc, log) => {
      const date = new Date(log.date).setHours(0, 0, 0, 0);
      if (!acc.includes(date)) {
        acc.push(date);
      }
      return acc;
    }, []).length;

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
