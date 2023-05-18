import { UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/types";
import mongoose from "mongoose";

const getUserByEmail = async (
  email: string
): Promise<User & mongoose.Document<User>> => {
  await connectMongo();
  const user = await UserModel.findOne({ email }).exec();
  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export default getUserByEmail;
