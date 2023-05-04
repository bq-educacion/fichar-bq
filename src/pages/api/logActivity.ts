import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { LOG_TYPE } from "@/types";
import addLog from "@/controllers/addLog";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  const email = session.user.email;
  const { type } = req.body;

  try {
    const lastLog = await addLog(email!, type);
    res.status(200).json(lastLog);
    res.end();
    return;
  } catch (e) {
    res.status(400).send("Bad Request");
    return;
  }
};

export default handler;
