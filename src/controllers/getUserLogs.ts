import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import { logSchema } from "@/schemas/db";
import { Log } from "@/types";
import { z } from "zod";

const getUserLogsInputSchema = z
  .object({
    email: z.string().email(),
    page: z.number().int().min(1),
    numberofdays: z.number().int().min(1),
  })
  .strict();

const getUserLogs = async (
  email: string,
  page: number,
  numberofdays: number
): Promise<Log[]> => {
  const input = parseWithSchema(getUserLogsInputSchema, {
    email,
    page,
    numberofdays,
  });

  await connectMongo();

  const logs = await LogModel.find({
    user: input.email,
    date: {
      $gte: new Date(
        new Date().setHours(0, 0, 0, 0) -
          input.page * input.numberofdays * 86400000
      ),
      $lte: new Date(
        new Date().setHours(23, 59, 59, 999) -
          (input.page - 1) * input.numberofdays * 86400000
      ),
    },
  })
    .sort({ date: -1 })
    .exec();

  return parseWithSchema(logSchema.array(), toPlainObject(logs));
};

export default getUserLogs;
