import { UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import { userSchema } from "@/schemas/db";
import { User } from "@/types";
import mongoose from "mongoose";
import { z } from "zod";
import computeUserStatus from "./computeUserStatus";

export type UserDocument = mongoose.Document & User;

const getUserByEmail = async (email: string): Promise<UserDocument> => {
  const parsedEmail = parseWithSchema(z.string().email(), email);

  await connectMongo();
  const user = await UserModel.findOne({ email: parsedEmail }).exec();
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.status) {
    user.status = await computeUserStatus(parsedEmail);
    await user.save();
  }

  if (typeof user.superadmin !== "boolean") {
    user.superadmin = false;
    await user.save();
  }

  parseWithSchema(userSchema, toPlainObject(user));
  return user as unknown as UserDocument;
};

export default getUserByEmail;
