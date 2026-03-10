import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { statsFromLogs } from "@/lib/utils";
import { parseWithSchema } from "@/lib/validation";
import { userStatsSchema } from "@/schemas/db";
import { UserStats } from "@/types";
import { z } from "zod";

const getUserStats = async (email: string): Promise<UserStats> => {
  const parsedEmail = parseWithSchema(z.string().email(), email);

  await connectMongo();

  const now = new Date();
  const todayMidnight = new Date(now).setHours(0, 0, 0, 0);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const dayOfWeek = now.getDay();
  const daysPassedWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

  const logsThisWeek = await LogModel.find({
    user: parsedEmail,
    date: {
      $gte: new Date(todayMidnight - daysPassedWeek * 24 * 60 * 60 * 1000),
      $lt: new Date(todayMidnight),
    },
  });

  const weekStats = statsFromLogs([...logsThisWeek]);

  const logsThisMonth = await LogModel.find({
    user: parsedEmail,
    date: {
      $gte: new Date(
        new Date(currentYear, currentMonth, 1).setHours(0, 0, 0, 0)
      ),
      $lt: new Date(todayMidnight),
    },
  });

  const monthStats = statsFromLogs([...logsThisMonth]);

  const logsThisYear = await LogModel.find({
    user: parsedEmail,
    date: {
      $gte: new Date(new Date(currentYear, 0, 1).setHours(0, 0, 0, 0)),
      $lt: new Date(todayMidnight),
    },
  });

  const yearStats = statsFromLogs([...logsThisYear]);

  return parseWithSchema(userStatsSchema, {
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
  });
};

export default getUserStats;
