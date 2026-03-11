import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { getHoursToday } from "@/lib/utils";
import { parseWithSchema } from "@/lib/validation";
import { userStatusSchema } from "@/schemas/db";
import { LOG_TYPE, USER_STATUS, UserStatus } from "@/types";
import { z } from "zod";

const computeUserStatusInputSchema = z.string().email();

export const deriveUserStatusFromLastLogType = (
  lastType: (typeof LOG_TYPE)[keyof typeof LOG_TYPE]
) => {
  if (lastType === LOG_TYPE.pause) {
    return USER_STATUS.paused;
  }

  if (lastType === LOG_TYPE.out) {
    return USER_STATUS.finished;
  }

  return USER_STATUS.working;
};

const computeUserStatus = async (email: string): Promise<UserStatus> => {
  const parsedEmail = parseWithSchema(computeUserStatusInputSchema, email);

  await connectMongo();

  const logsOfToday = await LogModel.find({
    user: parsedEmail,
    date: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
    },
  })
    .sort({ date: -1, _id: -1 })
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
  const status = deriveUserStatusFromLastLogType(lastType);

  return parseWithSchema(userStatusSchema, {
    status,
    date: lastDate,
    startDate,
    hoursToday,
    isMobile,
  });
};

export default computeUserStatus;
