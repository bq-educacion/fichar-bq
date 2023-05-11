import { useSession } from "next-auth/react";
import type { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { LogsStats, User } from "@/types";
import React from "react";
import Layout from "@/components/Layout";
import { UserModel } from "@/db/Models";
import getMyWorkers from "@/controllers/getMyWorkers";
import Link from "next/link";
import WorkersViewer from "@/components/WorkersViewer";
import WelcomeUser from "@/components/WelcomeUser";
import connectMongo from "@/lib/connectMongo";

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

  connectMongo();

  const user: User = await UserModel.findOne({
    email: session.user.email,
  }).exec();
  if (!user?.manager) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const myWorkers: Array<User & { stats: LogsStats }> = await getMyWorkers(
    user.email
  );

  return {
    props: {
      session,
      myWorkers: myWorkers
        .map((worker) => ({
          id: worker._id.toString(),
          name: worker.name,
          stats: worker.stats,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    },
  };
};

const Home: NextPage<{ myWorkers: Array<User & { stats: LogsStats }> }> = ({
  myWorkers,
}) => {
  const { data } = useSession({
    required: true,
  });

  return (
    <Layout active={2}>
      <WelcomeUser data={data!} />
      <WorkersViewer workers={myWorkers} />
      <br />
      <br />
    </Layout>
  );
};

export default Home;
