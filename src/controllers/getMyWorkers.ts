import { LogModel, UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { statsFromLogs } from "@/lib/utils";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import { logsStatsSchema, userSchema } from "@/schemas/db";
import { LogsStats, User } from "@/types";
import { z } from "zod";

const managerEmailSchema = z.string().email();
const workerWithStatsSchema = userSchema.extend({ stats: logsStatsSchema }).strict();

const getMyWorkers = async (
  manager: string
): Promise<Array<User & { stats: LogsStats }>> => {
  const parsedManager = parseWithSchema(managerEmailSchema, manager);

  await connectMongo();
  const workers = await getWorkers(parsedManager);

  const last30Days = new Date(new Date().setDate(new Date().getDate() - 30));
  const last30DaysWorkers = await Promise.all(
    workers.map(async (worker) => {
      return await LogModel.find({
        user: worker.email,
        date: { $gte: last30Days },
      }).exec();
    })
  );

  const fullWorkers = workers.map((worker, index) => {
    return {
      ...worker,
      stats: statsFromLogs(last30DaysWorkers[index]),
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
