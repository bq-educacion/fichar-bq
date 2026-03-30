import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { statsFromLogs } from "@/lib/utils";
import { parseWithSchema } from "@/lib/validation";
import { userStatsSchema } from "@/schemas/db";
import { UserStats } from "@/types";
import { z } from "zod";
import {
  type ClientTimeInput,
  addDays,
  getUtcRangeForLocalDate,
  resolveClientTimeContext,
} from "@/lib/clientTime";

const getUserStats = async (
  email: string,
  clientTimeInput: ClientTimeInput = {}
): Promise<UserStats> => {
  const parsedEmail = parseWithSchema(z.string().email(), email);

  await connectMongo();

  const context = resolveClientTimeContext(clientTimeInput);
  const { year, month, day } = context.nowLocalDate;

  // Boundary for the end of the queried periods
  // We query strictly < todayStartUtc, so today is excluded from historical stats
  const todayRange = getUtcRangeForLocalDate(context, context.nowLocalDate);
  const todayStartUtc = todayRange.startUtc;

  const localIsoDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = localIsoDate.getUTCDay();
  const daysPassedWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

  const weekStartLocalDate = addDays(context.nowLocalDate, -daysPassedWeek);
  const weekStartUtc = getUtcRangeForLocalDate(context, weekStartLocalDate).startUtc;

  const logsThisWeek = await LogModel.find({
    user: parsedEmail,
    date: {
      $gte: weekStartUtc,
      $lt: todayStartUtc,
    },
  });

  const weekStats = statsFromLogs([...logsThisWeek]);

  const monthStartLocalDate = { year, month, day: 1 };
  const monthStartUtc = getUtcRangeForLocalDate(context, monthStartLocalDate).startUtc;

  const logsThisMonth = await LogModel.find({
    user: parsedEmail,
    date: {
      $gte: monthStartUtc,
      $lt: todayStartUtc,
    },
  });

  const monthStats = statsFromLogs([...logsThisMonth]);

  const yearStartLocalDate = { year, month: 1, day: 1 };
  const yearStartUtc = getUtcRangeForLocalDate(context, yearStartLocalDate).startUtc;

  const logsThisYear = await LogModel.find({
    user: parsedEmail,
    date: {
      $gte: yearStartUtc,
      $lt: todayStartUtc,
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
