import { useSession, signIn } from "next-auth/react";
import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";
import styled from "@emotion/styled";
import { colors } from "@/styles/colors";
import React from "react";

export const getServerSideProps: GetServerSideProps = async (context) => {
  // get session data
  const session = await getServerSession(context.req, context.res, authOptions);
  // if autheticated redirect to /
  if (session?.user) {
    return {
      redirect: {
        destination: "/",
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

const Login = () => {
  const { data, status } = useSession();
  if (status === "authenticated") {
    //redirect to /
  } else {
    return (
      <Container>
        <button onClick={() => signIn("google")}>
          sign in with bq account
        </button>
      </Container>
    );
  }
};

export default Login;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  min-width: 400px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 1px solid ${colors.black};
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
`;
