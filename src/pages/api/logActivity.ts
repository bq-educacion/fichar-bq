import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  const email = session.user.email;
  const { type } = req.body;

  await connectMongo();

  const log = await LogModel.create({
    type,
    date: new Date(),
    user: email,
  });

  res.status(200).json(log);
  res.end();
};

export default handler;
