import setLegal from "@/controllers/setLegal";
import { formatZodError, isZodError, parseWithSchema } from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { setLegalResponseSchema } from "@/schemas/api";
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

    await setLegal(session.user.email);
    const payload = parseWithSchema(setLegalResponseSchema, "OK");

    res.status(200).send(payload);
  } catch (error) {
    if (isZodError(error)) {
      res.status(400).send(`Bad Request: ${formatZodError(error)}`);
      return;
    }

    res.status(400).send("Bad Request");
  }
};

export default handler;
