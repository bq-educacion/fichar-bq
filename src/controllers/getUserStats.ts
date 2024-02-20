import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import {
  logsIn,
  logsOut,
  numberOfDays,
  numberOfErrorLogs,
  realLogs,
  removeErrorLogs,
} from "@/lib/utils";
import { UserStats } from "@/types";

const getUserStats = async (email: string): Promise<UserStats> => {
  await connectMongo();

  // how many days have passed since the beginning of the week
  const daysPassedWeek = new Date().getDay();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // all logs from monday until yesterday
  const logsThisWeek = await LogModel.find({
    user: email,
    date: {
      $gte: new Date(
        new Date().setHours(0, 0, 0, 0) - daysPassedWeek * 24 * 60 * 60 * 1000
      ),
      $lt: new Date(new Date().setHours(0, 0, 0, 0)),
    },
  });

  //const realLogsThisWeek = realLogs(logsThisWeek);

  const realLogsThisWeek = [...logsThisWeek];

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
      : (logsThisWeekOut - logsThisWeekIn) / logsThisWeekDays / 1000 / 60 / 60;

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

  const realLogsThisMonth = [...logsThisMonth];

  //realLogs(logsThisMonth);

  // remove logs from days in which there is an error
  const logsThisMonthFiltered = removeErrorLogs(realLogsThisMonth);

  // number of days with error logs this month
  const errorLogsThisMonth = numberOfErrorLogs(realLogsThisMonth);

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

  // totoal hours worked this week
  const totalThisMonth = (logsThisMonthOut - logsThisMonthIn) / 1000 / 60 / 60;

  const logsThisYear = await LogModel.find({
    user: email,
    date: {
      $gte: new Date(new Date(currentYear, 0, 1).setHours(0, 0, 0, 0)),
      $lt: new Date().setHours(0, 0, 0, 0),
    },
  });

  // get last index with type error or type out

  const realLogsThisYear = [...logsThisYear];

  //realLogs(logsThisYear);

  // remove logs from days in which there is an error
  const logsThisYearFiltered = removeErrorLogs(realLogsThisYear);

  // number of days with error logs this year
  const errorLogsThisYear = numberOfErrorLogs(realLogsThisYear);

  // calculate the average for the year
  const logsThisYearIn = logsIn(logsThisYearFiltered);
  const logsThisYearOut = logsOut(logsThisYearFiltered);
  const logsThisYearDays = numberOfDays(logsThisYearFiltered);

  // average time worked this year in hours
  const averageThisYear =
    logsThisYearDays === 0
      ? 0
      : (logsThisYearOut - logsThisYearIn) / logsThisYearDays / 1000 / 60 / 60;

  // totoal hours worked this week
  const totalThisYear = (logsThisMonthOut - logsThisMonthIn) / 1000 / 60 / 60;

  return {
    totalThisWeek,
    totalThisMonth,
    totalThisYear,
    averageThisWeek,
    averageThisMonth,
    averageThisYear,
    logsThisYearDays,
    logsThisMonthDays,
    logsThisWeekDays,
    errorLogsThisWeek,
    errorLogsThisMonth,
    errorLogsThisYear,
  };
};

export default getUserStats;
