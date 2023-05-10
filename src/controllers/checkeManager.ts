import { UserModel } from "@/db/Models";
import { isMyWorker } from "./getMyWorkers";

const checkIfManager = async (
  managerEmail: string,
  workerEmail: string
): Promise<boolean> => {
  // user requesting stats must be a manager
  const manager = await UserModel.findOne({ email: managerEmail });
  if (!manager || !manager.isManager) {
    throw new Error("Unauthorized");
  }

  const worker = await UserModel.findOne({ email: workerEmail });
  if (!worker) {
    throw new Error("Worker not found");
  }

  // worker manager must be the same  as the manager requesting the stats (or manager of manager)
  return await isMyWorker(manager.email, workerEmail);
};

export default checkIfManager;
