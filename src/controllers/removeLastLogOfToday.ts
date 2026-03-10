import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { Log } from "@/types";
import updateUserStatus from "./updateUserStatus";

const removeLastLogOfToday = async (email: string): Promise<Log> => {
  await connectMongo();

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const lastLogOfToday = await LogModel.findOne({
    user: email,
    date: { $gte: todayStart },
  })
    .sort({ date: -1 })
    .exec();

  if (!lastLogOfToday) {
    throw new Error("No hay fichajes de hoy para eliminar");
  }

  await LogModel.deleteOne({ _id: lastLogOfToday._id }).exec();

  await updateUserStatus(email);

  return lastLogOfToday;
};

export default removeLastLogOfToday;
