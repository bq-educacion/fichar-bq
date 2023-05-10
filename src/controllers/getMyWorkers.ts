import { UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/types";

const getMyWorkers = async (manager: string): Promise<User[]> => {
  await connectMongo();
  return await getWorkers(manager);
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
