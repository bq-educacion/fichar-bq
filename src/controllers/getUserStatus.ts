import { UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { parseWithSchema } from "@/lib/validation";
import { userStatusSchema } from "@/schemas/db";
import { UserStatus } from "@/types";
import { z } from "zod";
import computeUserStatus from "./computeUserStatus";

const getUserStatus = async (email: string): Promise<UserStatus> => {
  const parsedEmail = parseWithSchema(z.string().email(), email);

  await connectMongo();
  const user = await UserModel.findOne({ email: parsedEmail }).exec();
  if (!user) {
    throw new Error("User not found");
  }

  const status = await computeUserStatus(parsedEmail);
  user.status = status;
  await user.save();

  return parseWithSchema(userStatusSchema, status);
};

export default getUserStatus;
