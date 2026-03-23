import AdminSectionTabs from "@/components/AdminSectionTabs";
import AdminSuggestions from "@/components/AdminSuggestions";
import getUserByEmail from "@/controllers/getUser";
import connectMongo from "@/lib/connectMongo";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import SimpleContainer from "@/ui/SimpleContainer";
import { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import React from "react";

const ADMIN_PANEL_MAX_WIDTH = "980px";

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

const AdminSuggestionsPage: NextPage = () => (
  <>
    <AdminSectionTabs
      active="suggestions"
      maxWidth={ADMIN_PANEL_MAX_WIDTH}
    />
    <SimpleContainer
      title="Administración · Sugerencias"
      textColor="#4e4f53"
      fontSize="14px"
      height="40px"
      backgroundImage="linear-gradient(220deg, #eee, #eee)"
      maxWidth={ADMIN_PANEL_MAX_WIDTH}
    >
      <AdminSuggestions />
    </SimpleContainer>
  </>
);

export default AdminSuggestionsPage;
