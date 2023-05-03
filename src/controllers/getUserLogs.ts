import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { Log } from "@/types";

const getUserLogs = async (
  email: string,
  page: number,
  numberofdays: number
): Promise<Log[]> => {
  await connectMongo();

  // get paginated logs for user considering page and numberofdays
  // logs of last numberofdays, beginning at page * numberofdays
  const logs = await LogModel.find({
    user: email,
    date: {
      $gte: new Date(
        new Date().setHours(0, 0, 0, 0) - page * numberofdays * 86400000
      ),
      $lte: new Date(
        new Date().setHours(23, 59, 59, 999) -
          (page - 1) * numberofdays * 86400000
      ),
    },
  })
    .sort({ date: -1 })
    .exec();

  return logs;
};

export default getUserLogs;
