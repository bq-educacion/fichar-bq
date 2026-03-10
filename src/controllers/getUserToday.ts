import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { getHoursToday } from "@/lib/utils";
import { parseWithSchema } from "@/lib/validation";
import { z } from "zod";

const getUserToday = async (email: string): Promise<number> => {
  const parsedEmail = parseWithSchema(z.string().email(), email);

  await connectMongo();

  const logsToday = await LogModel.find({
    user: parsedEmail,
    date: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
    },
  });

  return getHoursToday(logsToday);
};

export default getUserToday;
