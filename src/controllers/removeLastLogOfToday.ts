import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import { logSchema } from "@/schemas/db";
import { LOG_TYPE } from "@/types";
import { Log } from "@/types";
import { z } from "zod";
import { clearProjectDedicationsForToday } from "./projectDedications";
import updateUserStatus from "./updateUserStatus";

const removeLastLogOfToday = async (email: string): Promise<Log> => {
  const parsedEmail = parseWithSchema(z.string().email(), email);

  await connectMongo();

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const lastLogOfToday = await LogModel.findOne({
    user: parsedEmail,
    date: { $gte: todayStart },
  })
    .sort({ date: -1 })
    .exec();

  if (!lastLogOfToday) {
    throw new Error("No hay fichajes de hoy para eliminar");
  }

  await LogModel.deleteOne({ _id: lastLogOfToday._id }).exec();

  const newLastLogOfToday = await LogModel.findOne({
    user: parsedEmail,
    date: { $gte: todayStart },
  })
    .sort({ date: -1 })
    .exec();

  if (!newLastLogOfToday || newLastLogOfToday.type !== LOG_TYPE.out) {
    await clearProjectDedicationsForToday(parsedEmail);
  }

  await updateUserStatus(parsedEmail);

  return parseWithSchema(logSchema, toPlainObject(lastLogOfToday));
};

export default removeLastLogOfToday;
