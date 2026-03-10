import { UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { parseWithSchema } from "@/lib/validation";
import { z } from "zod";

const setLegal = async (email: string) => {
  const parsedEmail = parseWithSchema(z.string().email(), email);

  await connectMongo();
  const user = await UserModel.findOne({ email: parsedEmail }).exec();

  if (!user) {
    throw new Error("User not found");
  }

  user.legal = true;
  await user.save();
};

export default setLegal;
