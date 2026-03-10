import { addUser } from "@/controllers/User";
import connectMongo from "@/lib/connectMongo";
import { parseWithSchema } from "@/lib/validation";
import { authGoogleProfileSchema } from "@/schemas/api";
import NextAuth, {
  Account,
  Profile,
  SessionStrategy,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";

type SignInParams = {
  account: Account | null;
  profile: Profile | undefined;
};

export const authOptions = {
  callbacks: {
    async signIn({ account, profile }: SignInParams) {
      if (account?.provider !== "google" || !profile) {
        return false;
      }

      const parsedProfile = parseWithSchema(authGoogleProfileSchema, {
        email: profile.email,
        email_verified: Boolean(
          (profile as Profile & { email_verified?: boolean }).email_verified
        ),
        picture: (profile as Profile & { picture?: string }).picture,
        name: profile.name ?? undefined,
      });

      const isAllowedDomain =
        parsedProfile.email.endsWith("@bq.com") ||
        parsedProfile.email.endsWith("@bqeducacion.cc");

      if (!parsedProfile.email_verified || !isAllowedDomain) {
        return false;
      }

      await connectMongo();
      await addUser(
        parsedProfile.email,
        parsedProfile.picture ?? "",
        parsedProfile.name ?? parsedProfile.email
      );

      return true;
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt" as SessionStrategy,
    maxAge: 6 * 60 * 60,
  },
  secret: process.env.JWT_SECRET,
};

export default NextAuth(authOptions as any);
