import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { LOG_TYPE, Log } from "@/types";
import updateUserStatus from "./updateUserStatus";

const addLog = async (email: string, type: LOG_TYPE): Promise<Log> => {
  await connectMongo();

  const lastLog = await LogModel.findOne({ user: email })
    .sort({ date: -1 })
    .exec();

  if (type === LOG_TYPE.goback) {
    if (!lastLog || lastLog.type !== LOG_TYPE.out) {
      throw new Error("Bad Request");
    }
    lastLog.type = LOG_TYPE.pause;
    await lastLog.save();
    const log = await LogModel.create({
      type: LOG_TYPE.in,
      date: new Date(),
      user: email,
    });
    await updateUserStatus(email);
    return log;
  }

  if (type === LOG_TYPE.pause && lastLog?.type !== LOG_TYPE.in) {
    throw new Error("Bad Request");
  }

  if (type === LOG_TYPE.out && lastLog?.type !== LOG_TYPE.in) {
    throw new Error("Bad Request");
  }

  if (type === LOG_TYPE.in && lastLog?.type !== LOG_TYPE.pause) {
    throw new Error("Bad Request");
  }

  const log = await LogModel.create({
    type,
    date: new Date(),
    user: email,
  });

  await updateUserStatus(email);
  return log;
};

export default addLog;
