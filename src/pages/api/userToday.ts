import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import getUserToday from "@/controllers/getUserToday";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const email = session!.user!.email;

    const hoursToday = await getUserToday(email!);
    res.status(200).json({
      hoursToday,
    });

    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};

export default handler;
