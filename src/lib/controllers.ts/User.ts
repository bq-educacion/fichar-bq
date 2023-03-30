// add User if it doesn't exist

import { UserModel, User } from "@/db/Models";

export const addUser = async (email: string): Promise<User> => {
  console.log("addUser", email);
  const user = await UserModel.findOne({ email }).exec();
  if (!user) {
    console.log("addUser", email, "not found, creating");
    const user = new UserModel({ email, active: true });
    await user.save();
    //const user = await UserModel.create({ mail, active: true });
    console.log("addUser", email, "created");
    return user;
  }
  return user;
};

export const getUser = async (mail: string): Promise<User> => {
  return UserModel.findOne({ mail }).exec();
};
