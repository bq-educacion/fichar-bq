import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import getUserLogs from "@/controllers/getUserLogs";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const email = session!.user!.email;

    await connectMongo();

    // get body page and pagesize params
    const { page, numberofdays } = req.body;

    const logs = await getUserLogs(email!, page, numberofdays!);

    // return logs
    res.status(200).json(logs);
    res.end();
  } catch (e) {
    res.status(500).end();
  }
};

export default handler;
