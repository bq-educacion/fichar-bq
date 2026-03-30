import getUserStats from "@/controllers/getUserStats";
import { formatZodError, isZodError, parseWithSchema, toPlainObject } from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { myUserStatsQuerySchema, myUserStatsResponseSchema } from "@/schemas/api";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user || !session.user.email) {
      res.status(401).send("Unauthorized");
      return;
    }

    const query = parseWithSchema(myUserStatsQuerySchema, {
      clientTimezoneOffsetMinutes: Array.isArray(
        req.query.clientTimezoneOffsetMinutes
      )
        ? req.query.clientTimezoneOffsetMinutes[0]
        : req.query.clientTimezoneOffsetMinutes,
      clientTimeZone: Array.isArray(req.query.clientTimeZone)
        ? req.query.clientTimeZone[0]
        : req.query.clientTimeZone,
    });

    const data = await getUserStats(session.user.email, {
      clientTimezoneOffsetMinutes: query.clientTimezoneOffsetMinutes,
      clientTimeZone: query.clientTimeZone,
    });
    const payload = parseWithSchema(myUserStatsResponseSchema, toPlainObject(data));

    res.status(200).json(payload);
  } catch (error) {
    if (isZodError(error)) {
      res.status(400).send(`Bad Request: ${formatZodError(error)}`);
      return;
    }

    console.error(error);
    res.status(500).end();
  }
};

export default handler;
