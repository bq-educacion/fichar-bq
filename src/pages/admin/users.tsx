import AdminSectionTabs from "@/components/AdminSectionTabs";
import getUserByEmail from "@/controllers/getUser";
import connectMongo from "@/lib/connectMongo";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import SimpleContainer from "@/ui/SimpleContainer";
import styled from "@emotion/styled";
import { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import React from "react";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.email) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  await connectMongo();

  const user = await getUserByEmail(session.user.email);
  if (!user.legal) {
    return {
      redirect: {
        destination: "/legal",
        permanent: false,
      },
    };
  }

  if (!user.admin) {
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

const AdminUsersPage: NextPage = () => {
  return (
    <>
      <AdminSectionTabs active="users" />
      <SimpleContainer
        title="Administración · Usuarios"
        textColor="#4e4f53"
        fontSize="14px"
        height="40px"
        backgroundImage="linear-gradient(220deg, #eee, #eee)"
      >
        <Content>
          <Title>Sección en construcción</Title>
          <Text>
            Esta subsección está preparada para futuras herramientas de
            administración de usuarios.
          </Text>
        </Content>
      </SimpleContainer>
      <br />
      <br />
    </>
  );
};

const Content = styled.div`
  width: 100%;
  border-top: 2px solid #fff;
  padding: 24px;
  box-sizing: border-box;
`;

const Title = styled.div`
  font-size: 16px;
  font-weight: bold;
  color: #4e4f53;
  margin-bottom: 8px;
`;

const Text = styled.div`
  font-size: 14px;
  color: #4e4f53;
`;

export default AdminUsersPage;
