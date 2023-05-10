import { useSession } from "next-auth/react";
import type { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { User } from "@/types";
import React from "react";
import Layout from "@/components/Layout";
import { UserModel } from "@/db/Models";
import getMyWorkers from "@/controllers/getMyWorkers";
import Link from "next/link";

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

  const user: User = await UserModel.findOne({
    email: session.user.email,
  }).exec();
  if (!user?.manager) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const myWorkers: User[] = await getMyWorkers(user.email);

  return {
    props: {
      session,
      myWorkers: myWorkers
        .map((worker) => ({
          id: worker._id.toString(),
          name: worker.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    },
  };
};

const Home: NextPage<{ myWorkers: User[] }> = ({ myWorkers }) => {
  const { data } = useSession({
    required: true,
  });

  return (
    <Layout active={2}>
      {myWorkers.map((worker) => {
        return (
          <Link href={`/worker/${worker.id}`} key={worker.id}>
            {worker.name}
          </Link>
        );
      })}
    </Layout>
  );
};

export default Home;
