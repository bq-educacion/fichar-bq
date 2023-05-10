import { useSession, signOut } from "next-auth/react";
import type { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { LOG_TYPE, UserStatus, USER_STATUS, User } from "@/types";
import React from "react";
import UserStats from "@/components/UserStats";
import UserToday from "@/components/UserToday";
import { LogModel, UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import Layout from "@/components/Layout";
import WelcomeUser from "@/components/WelcomeUser";
import SingleBoxAction from "@/components/SingleBoxAction";
import ThreeBoxAction from "@/components/ThreeBoxAction";
import UserLogsComponent from "@/components/UserLogsComponent";

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

  let message = "";

  // if last log is not out and it is from yesterday, add a error log width date of yesterday
  await connectMongo();
  const lastLog = await LogModel.findOne({
    user: session.user.email,
  }).sort({ date: -1 });

  // if lastlog is not correct, create an error log and set user status to not_started
  if (
    lastLog &&
    ![LOG_TYPE.out, LOG_TYPE.error].includes(lastLog.type) &&
    new Date(lastLog.date).setHours(0, 0, 0, 0) !==
      new Date().setHours(0, 0, 0, 0)
  ) {
    console.log("last log not correct");
    await LogModel.create({
      type: LOG_TYPE.error,
      user: session.user.email,
      // lastLog.date + 1 minute
      date: new Date(lastLog.date).setMinutes(
        new Date(lastLog.date).getMinutes() + 1
      ),
    });
    const user = await UserModel.findOne({ email: session.user.email }).exec();
    // set user status to not_started

    user.status.status = USER_STATUS.not_started;
    user.status.date = new Date();
    console.log("user: ", user.status);
    await user?.save();

    message = "El último día se te olvidó desfichar";
  }

  return {
    props: {
      message,
      session,
    },
  };
};

const Home: NextPage<{ message: string }> = ({ message }) => {
  const getUserStatus = async () => {
    const res = await fetch("/api/userStatus");
    if (res.status !== 200) router.push("/login");
    const data = await res.json();
    setStatus({
      status: data.status,
      date: new Date(data.date),
      startDate: new Date(data.startDate),
      hoursToday: data.hoursToday,
    });
  };

  const router = useRouter();
  const [status, setStatus] = useState<UserStatus | undefined>(undefined);
  useEffect(() => {
    getUserStatus();
  }, []);

  // refetch every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      getUserStatus();
    }, 10 * 1000);
    return () => clearInterval(interval);
  }, []);

  const { data } = useSession({
    required: true,
  });

  return (
    <Layout active={0}>
      <WelcomeUser data={data!} />
      {status &&
        [USER_STATUS.working, USER_STATUS.paused].includes(status.status) && (
          <UserToday />
        )}
      {status &&
        [
          USER_STATUS.not_started,
          USER_STATUS.paused,
          USER_STATUS.finished,
          USER_STATUS.error,
        ].includes(status.status) && (
          <SingleBoxAction
            status={status}
            action={LOG_TYPE.in}
            refreshStatus={() => getUserStatus()}
          />
        )}
      {status && status.status === USER_STATUS.working && (
        <ThreeBoxAction refreshStatus={() => getUserStatus()} />
      )}
      {status && <UserStats status={status.status} />}
      {status && <UserLogsComponent status={status.status} />}
      <br />
      <br />
    </Layout>
  );
};

export default Home;
