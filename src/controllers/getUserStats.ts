import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { statsFromLogs } from "@/lib/utils";
import { UserStats } from "@/types";

const getUserStats = async (email: string): Promise<UserStats> => {
  await connectMongo();

  const now = new Date();
  const todayMidnight = new Date(now).setHours(0, 0, 0, 0);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // getDay() returns 0 for Sunday; treat Sunday as 7 so the week starts on Monday
  const dayOfWeek = now.getDay();
  const daysPassedWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

  // all logs from Monday until yesterday (exclusive of today)
  const logsThisWeek = await LogModel.find({
    user: email,
    date: {
      $gte: new Date(todayMidnight - daysPassedWeek * 24 * 60 * 60 * 1000),
      $lt: new Date(todayMidnight),
    },
  });

  const weekStats = statsFromLogs([...logsThisWeek]);

  // all logs from 1st of current month until yesterday
  const logsThisMonth = await LogModel.find({
    user: email,
    date: {
      $gte: new Date(
        new Date(currentYear, currentMonth, 1).setHours(0, 0, 0, 0)
      ),
      $lt: new Date(todayMidnight),
    },
  });

  const monthStats = statsFromLogs([...logsThisMonth]);

  // all logs from Jan 1st until yesterday
  const logsThisYear = await LogModel.find({
    user: email,
    date: {
      $gte: new Date(new Date(currentYear, 0, 1).setHours(0, 0, 0, 0)),
      $lt: new Date(todayMidnight),
    },
  });

  const yearStats = statsFromLogs([...logsThisYear]);

  return {
    totalThisWeek: weekStats.total,
    totalThisMonth: monthStats.total,
    totalThisYear: yearStats.total,
    averageThisWeek: weekStats.average,
    averageThisMonth: monthStats.average,
    averageThisYear: yearStats.average,
    logsThisWeekDays: weekStats.logsDays,
    logsThisMonthDays: monthStats.logsDays,
    logsThisYearDays: yearStats.logsDays,
    manualLogsThisWeek: weekStats.manualLogsDays,
    manualLogsThisMonth: monthStats.manualLogsDays,
    manualLogsThisYear: yearStats.manualLogsDays,
  };
};

export default getUserStats;
