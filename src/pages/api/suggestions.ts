import type { NextApiRequest, NextApiResponse } from "next";
import connectMongo from "@/lib/connectMongo";
import { SuggestionModel } from "@/db/Suggestion";
import {
  formatZodError,
  isZodError,
  parseWithSchema,
  toPlainObject,
} from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { suggestionCreateSchema, suggestionSchema } from "@/schemas/suggestion";
import { getServerSession } from "next-auth/next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      res.status(401).send("Unauthorized");
      return;
    }

    await connectMongo();

    const body = parseWithSchema(suggestionCreateSchema, req.body);
    const created = await SuggestionModel.create({
      text: body.text,
    });

    const payload = parseWithSchema(
      suggestionSchema,
      toPlainObject(created)
    );

    res.status(201).json(payload);
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
