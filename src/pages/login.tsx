import { useSession, signIn } from "next-auth/react";
import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";
import styled from "@emotion/styled";
import React from "react";
import { useRouter } from "next/router";
import GoogleButton from "@/components/GoogleButton";
import BQLogo from "@/assets/bq-logo-gray.svg";
import SiteFooter from "@/components/SiteFooter";

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
  const router = useRouter();
  const { status } = useSession();
  if (status === "authenticated") {
    router.push("/");
  } else {
    return (
      <Page>
        <Content>
          <BQLogo />
          <LogInBox>
            <P2>Inicia sesión</P2>
            <Rectangle />
            <LogIn>
              <P4>Accede con tu cuenta BQ</P4>
              <GoogleButton onClick={() => signIn("google")} />
            </LogIn>
          </LogInBox>
        </Content>
        <SiteFooter />
      </Page>
    );
  }
};

export default Login;

const Page = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 0 16px;
  box-sizing: border-box;
`;

const Content = styled.div`
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  & > svg {
    height: 40px;
    margin: -40px 0 80px 0;
    color: #44b8af;
  }
`;

const LogInBox = styled.div`
  box-shadow: 0 20px 60px 0 rgba(0, 0, 0, 0.1);
  border: solid 1px #f8f8f8;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 231px;
  width: 393px;
`;

const P2 = styled.div`
  margin: 29px 0 26px 0;
  font-weight: bold;
  font-family: Roboto;
  font-size: 18px;
  color: #4e4f53;
`;

const P4 = styled.div`
  margin: 0 0 10px 0;
  font-family: Roboto;
  font-size: 14px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.43;
  letter-spacing: normal;
  color: #4e4f53;
`;

const LogIn = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  & > p {
    margin: 0 0 10px 40px;
    align-self: flex-start;
  }
`;

const Rectangle = styled.div`
  width: 393px;
  height: 1px;
  background-image: linear-gradient(
    to right,
    #44b8af,
    #f6a001 33%,
    #e4002b 67%,
    #6d2077
  );
`;
