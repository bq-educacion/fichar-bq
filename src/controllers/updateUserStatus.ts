import { UserModel } from "@/db/Models";
import { parseWithSchema } from "@/lib/validation";
import { z } from "zod";
import computeUserStatus from "./computeUserStatus";

const updateUserStatus = async (email: string) => {
  const parsedEmail = parseWithSchema(z.string().email(), email);

  const status = await computeUserStatus(parsedEmail);
  const user = await UserModel.findOne({ email: parsedEmail }).exec();
  if (!user) {
    throw new Error("User not found");
  }

  user.status = status;
  await user.save();
};

export default updateUserStatus;
