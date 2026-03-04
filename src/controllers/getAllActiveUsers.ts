import { UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { USER_STATUS, User } from "@/types";
import computeUserStatus from "./computeUserStatus";

const getAllActiveUsers = async () => {
  await connectMongo();
  const users = await UserModel.find({ active: true })
    .collation({ locale: "es" })
    .sort({ name: 1 })
    .exec();

  for (let user of users) {
    if (!user.status) {
      const status = await computeUserStatus(user.email);
      user.status = status;
      await user.save();
    }

    if (user.status.status === USER_STATUS.finished) {
      const status = await computeUserStatus(user.email);
      user.status = status;
      await user.save();
    }
    // if status in but status is before today
    if (
      user.status.status !== USER_STATUS.finished &&
      user.status.date < new Date(new Date().setHours(0, 0, 0, 0))
    ) {
      const status = await computeUserStatus(user.email);
      user.status = status;
      await user.save();
    }
  }
  return users;
};

export default getAllActiveUsers;
