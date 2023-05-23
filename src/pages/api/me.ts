import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import getUserByEmail from "@/controllers/getUser";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const email = session!.user!.email;

    const user = await getUserByEmail(email!);

    // return logs
    res.status(200).json(user);
    res.end();
  } catch (e) {
    res.status(500).end();
  }
};

export default handler;
