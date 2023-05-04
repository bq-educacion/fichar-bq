import { LOG_TYPE, USER_STATUS } from "@/types";
import mongoose from "mongoose";

const LogSchema = new mongoose.Schema({
  type: { type: String, ENUM: LOG_TYPE, required: true },
  date: { type: Date, required: true },
  user: { type: String, required: true },
});

const UserStatusSchema = new mongoose.Schema(
  {
    status: { type: String, ENUM: USER_STATUS, required: true },
    date: { type: Date, required: false },
    startDate: { type: Date, required: false },
    hoursToday: { type: Number, required: false },
  },
  {
    _id: false,
  }
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    active: { type: Boolean, required: true, default: true },
    manager: {
      type: String,
      required: false,
      default: "alberto.valero@bq.com",
    },
    name: { type: String },
    image: { type: String },
    isManager: { type: Boolean, required: true, default: false },
    status: { type: UserStatusSchema, required: false },
  },
  {
    id: false,
  }
);
export const LogModel = mongoose.models.Log || mongoose.model("Log", LogSchema);
export const UserModel =
  mongoose.models.User || mongoose.model("User", UserSchema);
