import { useSession } from "next-auth/react";
import type { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { User } from "@/types";
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
  const getAllUsersStatus = async () => {
    const res = await fetch("/api/allUsersStatus");
    if (res.status !== 200) router.push("/login");
    const data = await res.json();
    setUsersStatus(data);
  };

  const router = useRouter();
  const [usersStatus, setUsersStatus] = useState<
    Omit<User, "isManager" | "active" | "manager" | "_id">[]
  >([]);
  useEffect(() => {
    getAllUsersStatus();
  }, []);

  // refetch every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      getAllUsersStatus();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
