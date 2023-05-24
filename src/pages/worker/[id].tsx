import { useSession, signOut } from "next-auth/react";
import type { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { Log, UserStats } from "@/types";
import React, { useEffect } from "react";
import { UserModel } from "@/db/Models";
import Layout from "@/components/Layout";
import getUserStats from "@/controllers/getUserStats";
import UserStatsViewer from "@/components/UserStatsViewer";
import SimpleContainer from "@/ui/SimpleContainer";
import getUserLogs from "@/controllers/getUserLogs";
import UserLogsComponentViewer from "@/components/UserLogsComponentViewer";
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
      workerEmail: worker.email,
    },
  };
};

const Home: NextPage<{
  stats: UserStats;
  name: string;
  workerEmail: string;
}> = ({ stats, name, workerEmail }) => {
  const { data } = useSession({
    required: true,
  });
  const [logs, setLogs] = React.useState<Log[]>([]);
  const fetchUserLogs = async () => {
    const response = await fetch(`/api/workerLogs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workerEmail, numberofdays: 7, page: 1 }),
    });
    const data = await response.json();
    setLogs(data);
  };

  useEffect(() => {
    fetchUserLogs();
  }, [workerEmail]);

  return (
    <>
      <br />
      <br />
      <SimpleContainer
        title={name}
        backgroundImage="linear-gradient(220deg, #eee, #eee)"
        textColor="#4e4f53"
        fontSize="14px"
        height="40px"
      >
        <UserStatsViewer stats={stats} />
        {logs.length > 0 && (
          <UserLogsComponentViewer key={workerEmail} logs={logs} />
        )}
      </SimpleContainer>
    </>
  );
};

export default Home;
