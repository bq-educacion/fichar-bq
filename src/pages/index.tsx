import { useSession, signOut } from "next-auth/react";
import type { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { LOG_TYPE, Status, USER_STATUS } from "@/types";
import styled from "@emotion/styled";
import { colors } from "@/styles/colors";
import Image from "next/image";
import React from "react";
import UserStats from "@/components/UserStats";
import UserToday from "@/components/UserToday";
import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import Header from "@/components/Header";
import Layout from "@/components/Layout";
import WelcomeUser from "@/components/WelcomeUser";
import SingleBoxAction from "@/components/SingleBoxAction";

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

  if (
    lastLog &&
    lastLog.type !== LOG_TYPE.out &&
    new Date(lastLog.date).setHours(0, 0, 0, 0) !==
      new Date().setHours(0, 0, 0, 0)
  ) {
    await LogModel.create({
      type: LOG_TYPE.error,
      user: session.user.email,
      date: lastLog.date,
    });
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
  const [status, setStatus] = useState<Status | undefined>(undefined);
  useEffect(() => {
    getUserStatus();
  }, []);

  const logActivity = async (type: LOG_TYPE) => {
    const res = await fetch("/api/logActivity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type }),
    });
    const data = await res.json();
    if (res.status !== 200) router.push("/login");
    else getUserStatus();
  };

  const { data } = useSession({
    required: true,
  });

  return (
    <Layout>
      <WelcomeUser data={data!} />
      {status && (
        <SingleBoxAction
          status={status}
          action={LOG_TYPE.in}
          refreshStatus={() => getUserStatus()}
        />
      )}

      {status && (
        <Container>
          {message !== "" && <div>{message}</div>}
          {status.status === USER_STATUS.paused && (
            <Button onClick={() => logActivity(LOG_TYPE.in)}>
              Volver al trabajo
            </Button>
          )}
          {status.status === USER_STATUS.working && (
            <>
              <Button onClick={() => logActivity(LOG_TYPE.pause)}>
                Hacer una pausa
              </Button>
              <Button onClick={() => logActivity(LOG_TYPE.out)}>
                Acabar por hoy
              </Button>
            </>
          )}
          <div>Status: {status.status}</div>
          {status.status !== USER_STATUS.error && (
            <Button onClick={() => logActivity(LOG_TYPE.error)}>
              Hoy la he lidado y no cuenta
            </Button>
          )}
          {status.status === USER_STATUS.error && (
            <div>Hoy la he lidado, mañana será otro día</div>
          )}
          <Button
            color={colors.white}
            backColor={colors.purple100}
            onClick={() => signOut()}
          >
            sign out
          </Button>
          <UserStats email={data?.user?.email || ""} />
          ------
          <br />
          <UserToday email={data?.user?.email || ""} />
        </Container>
      )}
    </Layout>
  );
};

export default Home;

const Button = styled.button<{ color?: string; backColor?: string }>`
  align-items: center;
  width: max-content;
  padding: 0 20px;
  height: 40px;
  border-radius: 4px;
  ${(props) =>
    props.color
      ? `
        color: ${props.color};
    `
      : `
        color: ${colors.white};
    `}
  ${(props) =>
    props.backColor
      ? `
        background-color: ${props.backColor};
    `
      : `
        background-color: ${colors.blackBackground};
    `}
  border: none;
  &:hover {
    background-color: ${colors.grayBlue2};
    cursor: pointer;
  }
  &:active {
    border: 1px solid ${colors.grayBlue};
  }
`;

const H1 = styled.h1`
  font-size: 26px;
  font-weight: 700;
  color: ${colors.black};
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  min-width: 400px;
  border: 1px solid ${colors.black};
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
`;

const Imagex = styled(Image)`
  border-radius: 50%;
`;
