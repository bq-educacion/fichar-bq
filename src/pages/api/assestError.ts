import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

import updateLog from "@/controllers/updateLog";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  const email = session.user.email;
  const { _id, error_text, error_hours } = req.body;

  try {
    const lastLog = await updateLog(_id, error_text, error_hours);
    res.status(200).json(lastLog);
    res.end();
    return;
  } catch (e) {
    res.status(400).send("Bad Request");
    return;
  }
};

export default handler;
