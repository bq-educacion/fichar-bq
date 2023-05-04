import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import getUserStatus from "@/controllers/getUserStatus";
import computeUserStatus from "@/controllers/computeUserStatus";
import getAllActiveUsers from "@/controllers/getAllActiveUsers";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const users = await getAllActiveUsers();
    const simplifiedUsers = users.map((user) => {
      return {
        email: user.email,
        status: user.status,
        image: user.image,
        name: user.name,
      };
    });
    res.status(200).json(simplifiedUsers);
    res.end();
  } catch (e) {
    res.status(500).end();
  }
};

export default handler;
