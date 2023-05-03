import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

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
    console.log(page, numberofdays);
    console.log(email);

    // get paginated logs for user considering page and numberofdays
    // logs of last numberofdays, beginning at page * numberofdays
    const logs = await LogModel.find({
      user: email,
      date: {
        $gte: new Date(
          new Date().setHours(0, 0, 0, 0) - page * numberofdays * 86400000
        ),
        $lte: new Date(
          new Date().setHours(23, 59, 59, 999) -
            (page - 1) * numberofdays * 86400000
        ),
      },
    })
      .sort({ date: -1 })
      .exec();

    console.log(logs);
    // return logs
    res.status(200).json(logs);
    res.end();
  } catch (e) {
    res.status(500).end();
  }
};

export default handler;
