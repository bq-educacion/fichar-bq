import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import setLegal from "@/controllers/setLegal";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user || !session.user.email) {
    res.status(401).send("Unauthorized");
    return;
  }

  const email = session.user.email;

  try {
    await setLegal(email);
    res.status(200).send("OK");
    res.end();
    return;
  } catch (e) {
    res.status(400).send("Bad Request");
    return;
  }
};

export default handler;
