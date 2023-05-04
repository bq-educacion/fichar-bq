import { UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/types";

const getAllActiveUsers = async (): Promise<User[]> => {
  await connectMongo();
  const users: User[] = await UserModel.find({ active: true })
    .collation({ locale: "es" })
    .sort({ name: 1 })
    .exec();
  return users;
};

export default getAllActiveUsers;
