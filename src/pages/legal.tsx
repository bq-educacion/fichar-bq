import { useSession } from "next-auth/react";
import type { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { useRouter } from "next/router";
import React from "react";
import getUserByEmail from "@/controllers/getUser";
import Legal from "@/components/Legal";
import TimedButton from "@/ui/TimedButton";

export const getServerSideProps: GetServerSideProps = async (context) => {
  // get session data
  const session = await getServerSession(context.req, context.res, authOptions);

  // if not authenticated redirect to /login
  if (!session?.user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  try {
    const user = await getUserByEmail(session.user.email || "foo");
    if (user.legal) {
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }
  } catch (e) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
};

const Home: NextPage<{}> = () => {
  const setLegal = async () => {
    await fetch("/api/setLegal");
    // go to / page
    router.push("/");
  };

  const router = useRouter();

  useSession({ required: true });

  return (
    <>
      <Legal />
      <TimedButton
        width="199px"
        height="50px"
        time={0}
        background="linear-gradient(256deg, #b68fbb, #ff5776)"
        margin="20px 0 20px 0"
        onClick={() => {
          setLegal();
        }}
      >
        Aceptar
      </TimedButton>
    </>
  );
};

export default Home;
