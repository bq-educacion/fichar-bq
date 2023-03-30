import { useSession, signOut } from "next-auth/react";
import type { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { LOG_TYPE, USER_STATUS } from "@/types";
import styled from "@emotion/styled";
import { colors } from "@/styles/colors";
import Image from "next/image";
import React from "react";
import UserStats from "@/components/UserStats";
import UserToday from "@/components/UserToday";

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

const Home: NextPage = () => {
  const getUserStatus = async () => {
    const res = await fetch("/api/userStatus");
    if (res.status !== 200) router.push("/login");

    const data = await res.json();
    setStatus(data.status);
  };

  const router = useRouter();
  const [status, setStatus] = useState<USER_STATUS | undefined>(undefined);
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
    <Container>
      <H1>{data?.user?.name || "Nombre no definido"}</H1>
      <Imagex
        width={100}
        height={100}
        src={data?.user?.image || ""}
        alt={data?.user?.name + " photo"}
      />
      {status === USER_STATUS.not_started && (
        <Button onClick={() => logActivity(LOG_TYPE.in)}>
          Empezar a trabajar
        </Button>
      )}
      {status === USER_STATUS.paused && (
        <Button onClick={() => logActivity(LOG_TYPE.in)}>
          Volver al trabajo
        </Button>
      )}
      {status === USER_STATUS.working && (
        <>
          <Button onClick={() => logActivity(LOG_TYPE.pause)}>
            Hacer una pausa
          </Button>
          <Button onClick={() => logActivity(LOG_TYPE.out)}>
            Acabar por hoy
          </Button>
        </>
      )}
      <div>Status: {status}</div>
      {status !== USER_STATUS.error && (
        <Button onClick={() => logActivity(LOG_TYPE.error)}>
          Hoy me he lidado y he cometido un error
        </Button>
      )}
      {status === USER_STATUS.error && (
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

// Container centered on page with border
const Container = styled.div`
  // center horizontally children
  display: flex;
  flex-direction: column;
  align-items: center;

  width: 800px;
  max-width: 800px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 1px solid ${colors.black};
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
`;

const Imagex = styled(Image)`
  border-radius: 50%;
`;
