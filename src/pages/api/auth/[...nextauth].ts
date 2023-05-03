import connectMongo from "@/lib/connectMongo";
import { addUser } from "@/controllers/User";
import NextAuth, {
  Account,
  Profile,
  Session,
  SessionStrategy,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";

type SignInParams = {
  account: Account | null;
  profile: (Profile & { picture: string }) | undefined;
};

export const authOptions = {
  callbacks: {
    async signIn({ account, profile }: SignInParams) {
      if (account!.provider === "google") {
        if (
          (profile! as any).email_verified &&
          profile!.email!.endsWith("@bq.com")
        ) {
          await connectMongo();
          console.log(profile);
          await addUser(profile?.email!, profile?.picture!, profile?.name!);
        }

        return (
          (profile! as any).email_verified &&
          profile!.email!.endsWith("@bq.com")
        );
      }

      return false;
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
    // expires after 6 hours idle
    maxAge: 6 * 60 * 60,
  },
  secret: process.env.JWT_SECRET,
};

export default NextAuth(authOptions as any);
