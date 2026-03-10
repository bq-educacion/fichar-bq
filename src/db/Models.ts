import {
  logNotesEnumSchema,
  logTypeEnumSchema,
  userStatusEnumSchema,
} from "@/schemas/db";
import mongoose from "mongoose";

const DEFAULT_MANAGER_EMAIL =
  process.env.DEFAULT_MANAGER_EMAIL || "alberto.valero@bqeducacion.cc";

const LogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: logTypeEnumSchema.options, required: true },
    date: { type: Date, required: true },
    user: { type: String, required: true },
    isMobile: { type: Boolean, required: true, default: false },
    manual: { type: Boolean, required: false, default: false },
    note: { type: String, enum: logNotesEnumSchema.options, required: false },
    logFile: { type: String, required: false },
  },
  {
    versionKey: false,
  }
);

const UserStatusSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: userStatusEnumSchema.options,
      required: true,
    },
    date: { type: Date, required: false },
    startDate: { type: Date, required: false },
    hoursToday: { type: Number, required: false },
    isMobile: { type: Boolean, required: false },
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
      default: DEFAULT_MANAGER_EMAIL,
    },
    name: { type: String },
    image: { type: String },
    isManager: { type: Boolean, required: true, default: false },
    admin: { type: Boolean, required: true, default: false },
    status: { type: UserStatusSchema, required: false },
    legal: { type: Boolean, default: false },
  },
  {
    id: false,
    versionKey: false,
  }
);

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endData: { type: Date, required: true },
    user: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
      default: [],
    },
  },
  {
    id: false,
    versionKey: false,
  }
);

export const LogModel = mongoose.models.Log || mongoose.model("Log", LogSchema);
export const UserModel =
  mongoose.models.User || mongoose.model("User", UserSchema);
export const ProjectModel =
  mongoose.models.Project || mongoose.model("Project", ProjectSchema);
