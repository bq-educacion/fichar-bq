import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import getUserLogs from "@/controllers/getUserLogs";
import checkIfManager from "@/controllers/checkeManager";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const { workerEmail, page, numberofdays } = req.body;
    if (!workerEmail || !page || !numberofdays) {
      res.status(400).send("Bad request");
      return;
    }

    if (!(await checkIfManager(session.user!.email!, workerEmail!))) {
      res.status(401).send("Unauthorized");
      return;
    }

    const logs = await getUserLogs(workerEmail!, page, numberofdays!);

    // return logs
    res.status(200).json(logs);
    res.end();
  } catch (e) {
    res.status(500).end();
  }
};

export default handler;
