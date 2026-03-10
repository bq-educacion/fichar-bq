import getUserByEmail from "@/controllers/getUser";
import { UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import {
  formatZodError,
  isZodError,
  parseWithSchema,
  toPlainObject,
} from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { adminUsersResponseSchema } from "@/schemas/api";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      res.status(401).send("Unauthorized");
      return;
    }

    const me = await getUserByEmail(session.user.email);
    if (!me.admin) {
      res.status(403).send("Forbidden");
      return;
    }

    await connectMongo();

    const users = await UserModel.find({ active: true })
      .collation({ locale: "es" })
      .sort({ name: 1 })
      .select("_id email name")
      .exec();

    const payload = parseWithSchema(adminUsersResponseSchema, toPlainObject(users));

    res.status(200).json(payload);
  } catch (error) {
    if (isZodError(error)) {
      res.status(400).send(`Bad Request: ${formatZodError(error)}`);
      return;
    }

    res.status(500).end();
  }
};

export default handler;
