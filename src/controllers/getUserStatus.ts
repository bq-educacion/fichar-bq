import { UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { User, UserStatus } from "@/types";

const getUserStatus = async (email: string): Promise<UserStatus> => {
  await connectMongo();
  const user: User = await UserModel.findOne({ email }).exec();
  if (!user) {
    throw new Error("User not found");
  }
  return user.status;
};

export default getUserStatus;
