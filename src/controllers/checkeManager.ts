import { UserModel } from "@/db/Models";
import { parseWithSchema } from "@/lib/validation";
import { z } from "zod";
import { isMyWorker } from "./getMyWorkers";

const checkIfManagerInputSchema = z
  .object({
    managerEmail: z.string().email(),
    workerEmail: z.string().email(),
  })
  .strict();

const checkIfManager = async (
  managerEmail: string,
  workerEmail: string
): Promise<boolean> => {
  const input = parseWithSchema(checkIfManagerInputSchema, {
    managerEmail,
    workerEmail,
  });

  const manager = await UserModel.findOne({ email: input.managerEmail });
  if (!manager || !manager.isManager) {
    throw new Error("Unauthorized");
  }

  const worker = await UserModel.findOne({ email: input.workerEmail });
  if (!worker) {
    throw new Error("Worker not found");
  }

  return await isMyWorker(manager.email, input.workerEmail);
};

export default checkIfManager;
