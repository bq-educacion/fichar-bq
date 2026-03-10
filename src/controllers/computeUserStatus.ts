import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { getHoursToday } from "@/lib/utils";
import { parseWithSchema } from "@/lib/validation";
import { userStatusSchema } from "@/schemas/db";
import { LOG_TYPE, USER_STATUS, UserStatus } from "@/types";
import { z } from "zod";

const computeUserStatusInputSchema = z.string().email();

const computeUserStatus = async (email: string): Promise<UserStatus> => {
  const parsedEmail = parseWithSchema(computeUserStatusInputSchema, email);

  await connectMongo();

  const logsOfToday = await LogModel.find({
    user: parsedEmail,
    date: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
    },
  })
    .sort({ date: -1 })
    .exec();

  if (logsOfToday.length === 0) {
    return parseWithSchema(userStatusSchema, {
      status: USER_STATUS.not_started,
      date: new Date(),
      hoursToday: 0,
    });
  }

  const lastType = logsOfToday[0].type;
  const lastDate = logsOfToday[0].date;
  const startDate = logsOfToday.at(-1)?.date;
  const isMobile = logsOfToday[0].isMobile;
  const hoursToday = getHoursToday([...logsOfToday].reverse());

  if (lastType === LOG_TYPE.in) {
    return parseWithSchema(userStatusSchema, {
      status: USER_STATUS.working,
      date: lastDate,
      startDate,
      hoursToday,
      isMobile,
    });
  }

  if (lastType === LOG_TYPE.pause) {
    return parseWithSchema(userStatusSchema, {
      status: USER_STATUS.paused,
      date: lastDate,
      startDate,
      hoursToday,
      isMobile,
    });
  }

  return parseWithSchema(userStatusSchema, {
    status: USER_STATUS.finished,
    date: lastDate,
    startDate,
    hoursToday,
    isMobile,
  });
};

export default computeUserStatus;
