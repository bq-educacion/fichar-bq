import { UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { USER_STATUS, User, UserStatus } from "@/types";
import computeUserStatus from "./computeUserStatus";

const getUserStatus = async (email: string): Promise<UserStatus> => {
  await connectMongo();
  const user = await UserModel.findOne({ email }).exec();
  if (!user) {
    throw new Error("User not found");
  }

  // if status is finished or error, recompute in case it is from yesterday
  if (
    user.status.status === USER_STATUS.finished ||
    user.status.status === USER_STATUS.error
  ) {
    const status = await computeUserStatus(email);
    user.status = status;
    await user.save();
  }

  return user.status;
};

export default getUserStatus;
