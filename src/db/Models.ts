// User model in mongoose

import connectMongo from "@/lib/connectMongo";
import { LOG_TYPE } from "@/types";
import mongoose from "mongoose";

const LogSchema = new mongoose.Schema({
  type: { type: String, ENUM: LOG_TYPE, required: true },
  date: { type: Date, required: true },
  user: { type: String, required: true },
});

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    active: { type: Boolean, required: true, default: true },
    manager: { type: String },
    isManager: { type: Boolean, required: true, default: false },
  },
  {
    id: false,
  }
);
export const LogModel = mongoose.models.Log || mongoose.model("Log", LogSchema);
export const UserModel =
  mongoose.models.User || mongoose.model("User", UserSchema);

export type User = {
  email: string;
  active: boolean;
};

export type Log = {
  id: mongoose.Schema.Types.ObjectId;
  type: "in" | "out";
  date: Date;
  user: User;
};
