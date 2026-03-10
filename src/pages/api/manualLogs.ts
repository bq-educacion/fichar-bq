import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

import replaceLogsWithManual from "@/controllers/replaceLogsWithManual";

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

  const email = session.user.email;
  const { startHour, endHour, pauses } = req.body;

  if (!startHour || !endHour) {
    res.status(400).send("Bad Request: startHour and endHour are required");
    return;
  }

  try {
    const logs = await replaceLogsWithManual(email!, {
      startHour,
      endHour,
      pauses: pauses || [],
    });
    res.status(200).json(logs);
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
