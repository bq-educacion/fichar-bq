import getAllActiveUsers from "@/controllers/getAllActiveUsers";
import { formatZodError, isZodError, parseWithSchema, toPlainObject } from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { allUsersStatusResponseSchema } from "@/schemas/api";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const users = await getAllActiveUsers();
    const simplifiedUsers = users.map((user) => ({
      email: user.email,
      status: user.status,
      image: user.image,
      name: user.name,
    }));

    const payload = parseWithSchema(
      allUsersStatusResponseSchema,
      toPlainObject(simplifiedUsers)
    );

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
