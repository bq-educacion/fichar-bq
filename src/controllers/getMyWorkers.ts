import { LogModel, UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { statsFromLogs } from "@/lib/utils";
import { LogsStats, User } from "@/types";

const getMyWorkers = async (
  manager: string
): Promise<Array<User & { stats: LogsStats }>> => {
  await connectMongo();
  const workers = await getWorkers(manager);

  // get las 30 days stats of my workers
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
      ...(worker as any).toObject(),
      stats: statsFromLogs(last30DaysWorkers[index]),
    };
  });

  return fullWorkers;
};

const getWorkers = async (manager: string): Promise<User[]> => {
  const workers: User[] = await UserModel.find({
    active: true,
    manager,
  }).exec();

  return [
    ...workers,
    ...(
      await Promise.all(
        workers
          .filter((w) => w.email !== manager && w.isManager)
          .map((worker) => getWorkers(worker.email))
      )
    ).flatMap((x) => x),
  ];
};

export const isMyWorker = async (
  manager: string,
  worker: string
): Promise<boolean> => {
  const workers = await getMyWorkers(manager);
  return workers.some((w) => w.email === worker);
};

export default getMyWorkers;
