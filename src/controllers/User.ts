// add User if it doesn't exist

import { UserModel } from "@/db/Models";
import { USER_STATUS, User } from "@/types";

export const addUser = async (
  email: string,
  image: string,
  name: string
): Promise<User> => {
  console.log("addUser", email);
  const user = await UserModel.findOne({ email }).exec();
  if (!user) {
    const user = new UserModel({
      email,
      active: true,
      image,
      name,
      status: {
        status: USER_STATUS.not_started,
        date: new Date(),
        hoursToday: 0,
      },
    });
    await user.save();
    //const user = await UserModel.create({ mail, active: true });
    console.log("addUser", email, "created");
    return user;
  }

  if (user.image !== image || user.name !== name) {
    user.image = image;
    user.name = name;
    await user.save();
  }

  return user;
};

export const getUser = async (mail: string): Promise<User> => {
  return UserModel.findOne({ mail }).exec();
};
