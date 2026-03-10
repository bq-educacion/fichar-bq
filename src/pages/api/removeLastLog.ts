import removeLastLogOfToday from "@/controllers/removeLastLogOfToday";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const deletedLog = await removeLastLogOfToday(session.user.email!);
    res.status(200).json(deletedLog);
    return;
  } catch (e) {
    if (e instanceof Error && e.message) {
      res.status(400).send(`Bad Request: ${e.message}`);
      return;
    }
    res.status(400).send("Bad Request");
    return;
  }
};

export default handler;
