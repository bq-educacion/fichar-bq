import { UserModel } from "@/db/Models";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import { userCreateSchema, userSchema, userStatusSchema } from "@/schemas/db";
import { USER_STATUS, User } from "@/types";
import { z } from "zod";

const addUserInputSchema = z
  .object({
    email: z.string().email(),
    image: z.string(),
    name: z.string().min(1),
  })
  .strict();

export const addUser = async (
  email: string,
  image: string,
  name: string
): Promise<User> => {
  const input = parseWithSchema(addUserInputSchema, { email, image, name });

  const user = await UserModel.findOne({ email: input.email }).exec();
  if (!user) {
    const status = parseWithSchema(userStatusSchema, {
      status: USER_STATUS.not_started,
      date: new Date(),
      hoursToday: 0,
    });

    const newUserData = parseWithSchema(userCreateSchema, {
      email: input.email,
      active: true,
      image: input.image,
      name: input.name,
      status,
    });

    const newUser = new UserModel(newUserData);
    await newUser.save();
    return parseWithSchema(userSchema, toPlainObject(newUser));
  }

  if (user.image !== input.image || user.name !== input.name) {
    user.image = input.image;
    user.name = input.name;
    await user.save();
  }

  return parseWithSchema(userSchema, toPlainObject(user));
};

export const getUser = async (mail: string): Promise<User | null> => {
  const email = parseWithSchema(z.string().email(), mail);
  const user = await UserModel.findOne({ email }).exec();

  if (!user) {
    return null;
  }

  return parseWithSchema(userSchema, toPlainObject(user));
};
