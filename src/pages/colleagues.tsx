import { useSession } from "next-auth/react";
import type { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import type { AllUsersStatusResponse } from "@/schemas/api";
import React from "react";
import Colleagues from "@/components/Colleagues";
import connectMongo from "@/lib/connectMongo";
import getUserByEmail from "@/controllers/getUser";

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

  await connectMongo();

  const user = await getUserByEmail(session.user.email || "foo");
  if (!user.legal) {
    return {
      redirect: {
        destination: "/legal",
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
  const router = useRouter();
  const [usersStatus, setUsersStatus] = useState<AllUsersStatusResponse>([]);

  const getAllUsersStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/allUsersStatus");
      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const errorBody = await res.text();
        console.error("Error fetching all users status:", errorBody);
        return;
      }

      const data = (await res.json()) as AllUsersStatusResponse;
      setUsersStatus(data);
    } catch (error) {
      console.error("Network error fetching all users status:", error);
    }
  }, [router]);

  useEffect(() => {
    getAllUsersStatus();
  }, [getAllUsersStatus]);

  // refetch every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      getAllUsersStatus();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [getAllUsersStatus]);

  const { data } = useSession({
    required: true,
  });

  return (
    <>
      {usersStatus.length > 0 && (
        <>
          <Colleagues users={usersStatus} />
        </>
      )}
      <br />
      <br />
    </>
  );
};

export default Home;
