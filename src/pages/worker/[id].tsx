import { useSession, signOut } from "next-auth/react";
import type { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { UserStats } from "@/types";
import React from "react";
import { UserModel } from "@/db/Models";
import Layout from "@/components/Layout";
import getUserStats from "@/controllers/getUserStats";
import UserStatsViewer from "@/components/UserStatsViewer";
import SimpleContainer from "@/ui/SimpleContainer";

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

  const manager = await UserModel.findOne({ email: session.user.email }).exec();

  if (!manager || !manager.isManager) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const worker = await UserModel.findById(context.params?.id).exec();
  //console.log(worker);
  if (!worker) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const stats = await getUserStats(worker.email);
  const name = worker.name;
  return {
    props: {
      stats,
      name,
      session,
    },
  };
};

const Home: NextPage<{ stats: UserStats; name: string }> = ({
  stats,
  name,
}) => {
  const { data } = useSession({
    required: true,
  });

  return (
    <Layout active={0}>
      <br />
      <br />
      <SimpleContainer
        title={name}
        backgroundImage="linear-gradient(220deg, #fe5000, #f6a001)"
      >
        <UserStatsViewer stats={stats} />
      </SimpleContainer>
    </Layout>
  );
};

export default Home;
