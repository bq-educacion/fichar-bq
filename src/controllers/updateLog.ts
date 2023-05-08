import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { Log } from "@/types";

const updateLog = async (
  _id: string,
  error_text: string,
  error_hours: string
): Promise<Log> => {
  await connectMongo();

  const log = await LogModel.findById(_id).exec();
  if (!log) {
    throw new Error("Bad Request");
  }
  log.error_text = error_text;
  log.error_hours = error_hours;
  await log.save();

  return log;
};

export default updateLog;
