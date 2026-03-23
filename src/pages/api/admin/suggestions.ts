import getUserByEmail from "@/controllers/getUser";
import { SuggestionModel } from "@/db/Suggestion";
import connectMongo from "@/lib/connectMongo";
import {
  formatZodError,
  isZodError,
  parseWithSchema,
  toPlainObject,
} from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  suggestionArchivedQuerySchema,
  suggestionSchema,
  suggestionsResponseSchema,
  suggestionUpdateSchema,
} from "@/schemas/suggestion";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

const firstQueryValue = (
  value: string | string[] | undefined
): string | undefined => (Array.isArray(value) ? value[0] : value);

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!["GET", "PATCH"].includes(req.method ?? "")) {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      res.status(401).send("Unauthorized");
      return;
    }

    const me = await getUserByEmail(session.user.email);
    if (!me.admin) {
      res.status(403).send("Forbidden");
      return;
    }

    await connectMongo();

    if (req.method === "GET") {
      const archivedQuery = parseWithSchema(
        suggestionArchivedQuerySchema,
        firstQueryValue(req.query.archived)
      );
      const filter =
        archivedQuery === undefined
          ? {}
          : {
              archived: archivedQuery === "true",
            };

      const suggestions = await SuggestionModel.find(filter)
        .sort({ date: -1 })
        .exec();
      const payload = parseWithSchema(
        suggestionsResponseSchema,
        toPlainObject(suggestions)
      );

      res.status(200).json(payload);
      return;
    }

    const body = parseWithSchema(suggestionUpdateSchema, req.body);
    const updated = await SuggestionModel.findByIdAndUpdate(
      body.id,
      { archived: body.archived },
      { new: true }
    ).exec();

    if (!updated) {
      res.status(404).send("Suggestion not found");
      return;
    }

    const payload = parseWithSchema(
      suggestionSchema,
      toPlainObject(updated)
    );

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
