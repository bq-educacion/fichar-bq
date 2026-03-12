import { LogModel, UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { statsFromLogs } from "@/lib/utils";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import { logsStatsSchema, userSchema } from "@/schemas/db";
import { LogsStats, User } from "@/types";
import { z } from "zod";

const managerEmailSchema = z.string().email();
const workerWithStatsSchema = userSchema.extend({ stats: logsStatsSchema }).strict();
const MANAGER_STATS_DAYS_WINDOW = 30;

const getMyWorkers = async (
  manager: string
): Promise<Array<User & { stats: LogsStats }>> => {
  const parsedManager = parseWithSchema(managerEmailSchema, manager);

  await connectMongo();
  const workers = await getWorkers(parsedManager);

  const now = new Date();
  const last30Days = new Date(now);
  last30Days.setHours(0, 0, 0, 0);
  last30Days.setDate(last30Days.getDate() - (MANAGER_STATS_DAYS_WINDOW - 1));

  const last30DaysWorkers = await Promise.all(
    workers.map(async (worker) => {
      return await LogModel.find({
        user: worker.email,
        date: { $gte: last30Days, $lte: now },
      })
        .sort({ date: 1 })
        .exec();
    })
  );

  const fullWorkers = workers.map((worker, index) => {
    const workerStats = statsFromLogs(last30DaysWorkers[index]);

    return {
      ...worker,
      stats: workerStats,
    };
  });

  return parseWithSchema(workerWithStatsSchema.array(), toPlainObject(fullWorkers));
};

const getWorkers = async (manager: string): Promise<User[]> => {
  const parsedManager = parseWithSchema(managerEmailSchema, manager);

  const workersDocs = await UserModel.find({
    active: true,
    manager: parsedManager,
  }).exec();

  const workers = parseWithSchema(userSchema.array(), toPlainObject(workersDocs));

  const nestedWorkers = await Promise.all(
    workers
      .filter((worker) => worker.email !== parsedManager && worker.isManager)
      .map((worker) => getWorkers(worker.email))
  );

  return [...workers, ...nestedWorkers.flatMap((x) => x)];
};

export const isMyWorker = async (
  manager: string,
  worker: string
): Promise<boolean> => {
  const parsedManager = parseWithSchema(managerEmailSchema, manager);
  const parsedWorker = parseWithSchema(managerEmailSchema, worker);

  const workers = await getMyWorkers(parsedManager);
  return workers.some((w) => w.email === parsedWorker);
};

export default getMyWorkers;
