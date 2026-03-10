import { UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import { userSchema } from "@/schemas/db";
import { USER_STATUS } from "@/types";
import computeUserStatus from "./computeUserStatus";

const getAllActiveUsers = async () => {
  await connectMongo();
  const users = await UserModel.find({ active: true })
    .collation({ locale: "es" })
    .sort({ name: 1 })
    .exec();

  for (const user of users) {
    let shouldSave = false;

    // Backfill legacy docs that predate the `admin`/`isManager` fields.
    if (typeof user.admin !== "boolean") {
      user.admin = false;
      shouldSave = true;
    }

    if (typeof user.isManager !== "boolean") {
      user.isManager = false;
      shouldSave = true;
    }

    if (!user.status) {
      const status = await computeUserStatus(user.email);
      user.status = status;
      shouldSave = true;
    }

    if (user.status.status === USER_STATUS.finished) {
      const status = await computeUserStatus(user.email);
      user.status = status;
      shouldSave = true;
    }

    if (
      user.status.status !== USER_STATUS.finished &&
      user.status.date &&
      user.status.date < new Date(new Date().setHours(0, 0, 0, 0))
    ) {
      const status = await computeUserStatus(user.email);
      user.status = status;
      shouldSave = true;
    }

    if (shouldSave) {
      await user.save();
    }
  }

  return parseWithSchema(userSchema.array(), toPlainObject(users));
};

export default getAllActiveUsers;
