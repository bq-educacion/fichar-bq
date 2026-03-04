import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { Log, USER_STATUS, UserStatus } from "@/types";
import { getHoursToday } from "@/lib/utils";

const computeUserStatus = async (email: string): Promise<UserStatus> => {
  await connectMongo();

  const logsOfToday: Log[] = await LogModel.find({
    user: email,
    date: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
    },
  })
    .sort({ date: -1 })
    .exec();

  // not yet started to work
  if (logsOfToday.length === 0) {
    return { status: USER_STATUS.not_started, date: new Date(), hoursToday: 0 };
  } else {
    const lastType = logsOfToday[0].type;
    const lastDate = logsOfToday[0].date;
    const startDate = logsOfToday.at(-1)?.date;
    const isMobile = logsOfToday[0].isMobile;
    const hoursToday = getHoursToday([...logsOfToday].reverse());

    if (lastType === "in") {
      return {
        status: USER_STATUS.working,
        date: lastDate,
        startDate,
        hoursToday,
        isMobile,
      };
    } else if (lastType === "pause") {
      return {
        status: USER_STATUS.paused,
        date: lastDate,
        startDate,
        hoursToday,
        isMobile,
      };
    } else {
      return {
        status: USER_STATUS.finished,
        date: lastDate,
        startDate,
        hoursToday,
        isMobile,
      };
    }
  }
};

export default computeUserStatus;
