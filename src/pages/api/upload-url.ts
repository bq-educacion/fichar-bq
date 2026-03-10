import { Storage } from "@google-cloud/storage";
import { formatZodError, isZodError, parseWithSchema, toPlainObject } from "@/lib/validation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { uploadUrlQuerySchema, uploadUrlResponseSchema } from "@/schemas/api";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

const gcloudEnvSchema = z
  .object({
    GCLOUD_BUCKET_NAME: z.string().min(1),
    GCLOUD_PROJECT_ID: z.string().min(1),
    GCLOUD_CLIENT_EMAIL: z.string().min(1),
    GCLOUD_PRIVATE_KEY: z.string().min(1),
  })
  .strict();

const gcloudCredentialsSchema = z
  .object({
    client_email: z.string().min(1),
    private_key: z.string().min(1),
  })
  .strict();

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

    const env = parseWithSchema(gcloudEnvSchema, {
      GCLOUD_BUCKET_NAME: process.env.GCLOUD_BUCKET_NAME,
      GCLOUD_PROJECT_ID: process.env.GCLOUD_PROJECT_ID,
      GCLOUD_CLIENT_EMAIL: process.env.GCLOUD_CLIENT_EMAIL,
      GCLOUD_PRIVATE_KEY: process.env.GCLOUD_PRIVATE_KEY,
    });

    const query = parseWithSchema(uploadUrlQuerySchema, {
      file: Array.isArray(req.query.file) ? req.query.file[0] : req.query.file,
    });

    const credentials = parseWithSchema(
      gcloudCredentialsSchema,
      JSON.parse(
        Buffer.from(env.GCLOUD_PRIVATE_KEY, "base64").toString().replace(/\n/g, "")
      )
    );

    const storage = new Storage({
      projectId: env.GCLOUD_PROJECT_ID,
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    });

    const bucket = storage.bucket(env.GCLOUD_BUCKET_NAME);
    const file = bucket.file(query.file);

    const [response] = await file.generateSignedPostPolicyV4({
      expires: Date.now() + 1 * 60 * 1000,
      fields: { "x-goog-meta-test": "data" },
    });

    const payload = parseWithSchema(uploadUrlResponseSchema, toPlainObject(response));
    res.status(200).json(payload);
  } catch (error) {
    if (isZodError(error)) {
      res.status(400).send(`Bad Request: ${formatZodError(error)}`);
      return;
    }

    res.status(400).send("Bad Request");
  }
};

export default handler;
