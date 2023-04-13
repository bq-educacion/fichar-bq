import styled from "@emotion/styled";
import { Session } from "next-auth";
import Image from "next/image";
import React, { FC } from "react";

const WelcomeUser: FC<{ data: Session }> = ({ data }) => {
  const user = data.user!;
  return (
    <Container>
      <StyledImage
        width={76}
        height={76}
        src={data?.user?.image || ""}
        alt={data?.user?.name + " photo"}
      />
      <H1>¡Hola, {data.user?.name!.split(" ").at(0)}!</H1>
      <H2>{user.email}</H2>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 42px;
  padding-bottom: 40px;
`;

const StyledImage = styled(Image)`
  border-radius: 50%;
  margin-bottom: 22px;
`;

const H1 = styled.h1`
  height: 30px;
  font-family: Roboto;
  font-size: 25px;
  font-weight: bold;
  line-height: 1.2;
  text-align: center;
  color: #4e4f53;
  margin: 0;
`;

const H2 = styled.h2`
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.67;
  text-align: center;
  color: #434242;
`;

export default WelcomeUser;
