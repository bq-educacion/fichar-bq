import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import getUserStats from "@/controllers/getUserStats";
import { UserModel } from "@/db/Models";
import { isMyWorker } from "@/controllers/getMyWorkers";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    // user requesting stats must be a manager
    const manager = await UserModel.findOne({ email: session.user.email });
    if (!manager || !manager.isManager) {
      res.status(401).send("Unauthorized");
      return;
    }

    // read worker email from body
    const { workerEmail } = req.body;

    if (!workerEmail) {
      res.status(400).send("Bad Request");
      return;
    }

    const worker = await UserModel.findOne({ email: workerEmail });

    // worker manager must be the same  as the manager requesting the stats (or manager of manager)

    const isMine = await isMyWorker(manager.email, workerEmail);
    console.log("isMine", isMine);
    if (!isMine) {
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
