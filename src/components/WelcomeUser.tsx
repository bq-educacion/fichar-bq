import styled from "@emotion/styled";
import { Session } from "next-auth";
import Image from "next/image";
import React, { FC } from "react";

const WelcomeUser: FC<{ data: Session }> = ({ data }) => {
  const user = data.user!;
  return (
    <Container>
      <ImageMask>
        <Image
          width={72}
          height={72}
          src={data?.user?.image || ""}
          alt={data?.user?.name + " photo"}
        />
      </ImageMask>
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

const ImageMask = styled.div`
  width: 76px;
  height: 76px;
  background-image: linear-gradient(
    52deg,
    #44b8af 14%,
    #f6a001 38%,
    #e4002b 62%,
    #6d2077 86%
  );
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 22px;
  img {
    border-radius: 50%;
  }
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
