import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { Storage } from "@google-cloud/storage";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user || !session.user.email) {
    res.status(401).send("Unauthorized");
    return;
  }

  if (
    !process.env.GCLOUD_BUCKET_NAME ||
    !process.env.GCLOUD_PROJECT_ID ||
    !process.env.GCLOUD_CLIENT_EMAIL ||
    !process.env.GCLOUD_PRIVATE_KEY ||
    typeof process.env.GCLOUD_BUCKET_NAME !== "string"
  ) {
    console.error("Missing env variables");
    res.status(400).send("Bad Request");
    return;
  }

  if (!req.query.file || typeof req.query.file !== "string") {
    console.error("Missing file query param");
    res.status(400).send("Bad Request");
    return;
  }

  // decode base64 encoded private key
  const credentials = JSON.parse(
    Buffer.from(process.env.GCLOUD_PRIVATE_KEY as string, "base64")
      .toString()
      .replace(/\n/g, "")
  );

  console.log("credentials", credentials);

  const storage = new Storage({
    projectId: process.env.GCLOUD_PROJECT_ID,
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
  });
  const bucket = storage.bucket(process.env.GCLOUD_BUCKET_NAME);
  const file = bucket.file(req.query.file);
  const options = {
    expires: Date.now() + 1 * 60 * 1000, //  1 minute,
    fields: { "x-goog-meta-test": "data" },
  };

  const [response] = await file.generateSignedPostPolicyV4(options);
  res.status(200).json(response);
};

export default handler;
