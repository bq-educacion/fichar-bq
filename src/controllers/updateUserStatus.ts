import { UserModel } from "@/db/Models";
import computeUserStatus from "./computeUserStatus";

const updateUserStatus = async (email: string) => {
  const status = await computeUserStatus(email);
  const user = await UserModel.findOne({ email }).exec();
  if (!user) {
    throw new Error("User not found");
  }
  console.log(status);
  user.status = status;
  await user.save();
};

export default updateUserStatus;
