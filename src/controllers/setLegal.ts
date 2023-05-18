import { UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";

const setLegal = async (email: string) => {
  await connectMongo();
  const user = await UserModel.findOne({ email }).exec();
  user.legal = true;
  await user.save();
};

export default setLegal;
