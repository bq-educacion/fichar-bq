import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import getUserStats from "@/controllers/getUserStats";
import checkIfManager from "@/controllers/checkeManager";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const { workerEmail } = req.body;
    if (!workerEmail) {
      res.status(400).send("Bad request");
      return;
    }

    if (!(await checkIfManager(session.user!.email!, workerEmail!))) {
      res.status(401).send("Unauthorized");
      return;
    }

    const data = await getUserStats(workerEmail!);
    res.status(200).json(data);

    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};

export default handler;
