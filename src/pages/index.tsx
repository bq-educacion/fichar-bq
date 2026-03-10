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
import getUserByEmail from "@/controllers/getUser";
import styled from "@emotion/styled";

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

  let message = "";

  // if last log is not out and it is from a previous day, auto-close with an 'out' log

  const lastLog = await LogModel.findOne({
    user: session.user.email,
  }).sort({ date: -1 });

  if (
    lastLog &&
    lastLog.type !== LOG_TYPE.out &&
    new Date(lastLog.date).setHours(0, 0, 0, 0) !==
      new Date().setHours(0, 0, 0, 0)
  ) {
    // auto-close the previous day at 23:59 of that day
    const lastLogDate = new Date(lastLog.date);
    const autoOutDate = new Date(lastLogDate);
    autoOutDate.setHours(23, 59, 0, 0);

    await LogModel.create({
      type: LOG_TYPE.out,
      user: session.user.email,
      date: autoOutDate,
    });
    const user = await getUserByEmail(session.user.email || "foo");
    user.status.status = USER_STATUS.not_started;
    user.status.date = new Date();
    await user?.save();

    message = "El último día se te olvidó desfichar (cerrado automáticamente)";
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

  // refetch every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      getUserStatus();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const { data } = useSession({
    required: true,
  });

  return (
    <>
      <WelcomeUser data={data!} />
      {status &&
        ([USER_STATUS.working, USER_STATUS.paused] as USER_STATUS[]).includes(
          status.status
        ) && (
          <UserToday />
        )}
      {status &&
        (
          [
            USER_STATUS.not_started,
            USER_STATUS.paused,
            USER_STATUS.finished,
          ] as USER_STATUS[]
        ).includes(status.status) && (
          <SingleBoxAction
            status={status}
            action={LOG_TYPE.in}
            refreshStatus={() => getUserStatus()}
          />
        )}
      {status && status.status === USER_STATUS.working && (
        <ThreeBoxAction refreshStatus={() => getUserStatus()} />
      )}
      {status && (
        <ContentModules>
          <UserStats status={status.status} />
          <UserLogsComponent status={status.status} />
        </ContentModules>
      )}
      <br />
      <br />
    </>
  );
};

const ContentModules = styled.div`
  width: 614px;
  max-width: 100%;
`;

export default Home;
