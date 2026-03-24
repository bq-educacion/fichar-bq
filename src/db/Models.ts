import {
  logNotesEnumSchema,
  logTypeEnumSchema,
  userStatusEnumSchema,
} from "@/schemas/db";
import { getCurrentSalaryEntryFromUser } from "@/lib/userSalary";
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

const UserSalaryHistorySchema = new mongoose.Schema(
  {
    initDate: { type: Date, required: true },
    valueEncrypted: { type: String, required: true },
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
    superadmin: { type: Boolean, required: true, default: false },
    salaryHistory: {
      type: [UserSalaryHistorySchema],
      default: [],
      select: false,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
    },
    status: { type: UserStatusSchema, required: false },
    legal: { type: Boolean, default: false },
  },
  {
    id: false,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.salaryHistory;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        delete ret.salaryHistory;
        return ret;
      },
    },
  }
);

UserSchema.virtual("salary")
  .get(function getSalary(this: mongoose.Document) {
    return getCurrentSalaryEntryFromUser(this)?.salary;
  });

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

const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    costesGenerales: { type: Boolean, required: true, default: false },
  },
  {
    id: false,
    versionKey: false,
  }
);

const ProjectDedicationItemSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    dedication: { type: Number, required: true, min: 0, max: 100 },
  },
  {
    _id: false,
  }
);

const ProjectDedicationSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dedications: {
      type: [ProjectDedicationItemSchema],
      default: [],
    },
  },
  {
    id: false,
    versionKey: false,
  }
);

ProjectDedicationSchema.index({ userId: 1, date: 1 }, { unique: true });

const MonthlyGeneralCostSchema = new mongoose.Schema(
  {
    month: { type: Date, required: true, unique: true, index: true },
    amount: { type: Number, required: true, min: 0, default: 0 },
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
export const DepartmentModel =
  mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
export const ProjectDedicationModel =
  mongoose.models.ProjectDedication ||
  mongoose.model("ProjectDedication", ProjectDedicationSchema);
export const MonthlyGeneralCostModel =
  mongoose.models.MonthlyGeneralCost ||
  mongoose.model("MonthlyGeneralCost", MonthlyGeneralCostSchema);
