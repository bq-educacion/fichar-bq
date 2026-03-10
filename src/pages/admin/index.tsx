import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/admin/projects",
      permanent: false,
    },
  };
};

const AdminIndexPage = () => null;

export default AdminIndexPage;
