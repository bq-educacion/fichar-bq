import { UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

type AdminAuthorizationContext = {
  email: string;
  admin: boolean;
  superadmin: boolean;
};

type RequireAdminAuthorizationOptions = {
  requireSuperadmin?: boolean;
};

export const setNoStoreHeaders = (res: NextApiResponse): void => {
  res.setHeader(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
};

export const requireAdminAuthorization = async (
  req: NextApiRequest,
  res: NextApiResponse,
  options: RequireAdminAuthorizationOptions = {}
): Promise<AdminAuthorizationContext | null> => {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    res.status(401).send("Unauthorized");
    return null;
  }

  await connectMongo();

  const user = await UserModel.findOne({ email: session.user.email })
    .select("email admin superadmin")
    .exec();

  if (!user?.admin) {
    res.status(403).send("Forbidden");
    return null;
  }

  if (options.requireSuperadmin && !user.superadmin) {
    res.status(403).send("Forbidden");
    return null;
  }

  return {
    email: user.email,
    admin: Boolean(user.admin),
    superadmin: Boolean(user.superadmin),
  };
};
