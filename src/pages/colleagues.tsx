import { useSession } from "next-auth/react";
import type { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { User } from "@/types";
import { colors } from "@/styles/colors";
import React from "react";
import Layout from "@/components/Layout";
import WelcomeUser from "@/components/WelcomeUser";

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

  // refetch every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      getAllUsersStatus();
    }, 10 * 1000);
    return () => clearInterval(interval);
  }, []);

  const { data } = useSession({
    required: true,
  });

  return (
    <Layout>
      <WelcomeUser data={data!} />
      {usersStatus.length > 0 && (
        <>
          {usersStatus.map((user) => {
            return (
              <>
                {user.email} {user.status.status}
              </>
            );
          })}
        </>
      )}
      <br />
      <br />
    </Layout>
  );
};

export default Home;
