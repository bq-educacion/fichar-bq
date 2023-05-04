import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { LOG_TYPE, Log } from "@/types";
import updateUserStatus from "./updateUserStatus";

const addLog = async (email: string, type: LOG_TYPE): Promise<Log> => {
  await connectMongo();

  if (type === LOG_TYPE.goback) {
    const lastLog = await LogModel.findOne({ user: email })
      .sort({ date: -1 })
      .exec();
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
  const log = await LogModel.create({
    type,
    date: new Date(),
    user: email,
  });

  await updateUserStatus(email);
  return log;
};

export default addLog;
