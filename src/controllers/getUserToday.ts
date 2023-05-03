import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { getHoursToday } from "@/lib/utils";

const getUserToday = async (email: string): Promise<{ hoursToday: number }> => {
  await connectMongo();

  const logsToday = await LogModel.find({
    user: email,
    date: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
    },
  });

  const hoursToday = getHoursToday(logsToday);

  return {
    hoursToday,
  };
};

export default getUserToday;
