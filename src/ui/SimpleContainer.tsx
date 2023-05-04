import React, { FC, ReactNode } from "react";
import IconDirection from "@/assets/icons/icon-direction.svg";
import styled from "@emotion/styled";

const SimpleContainer: FC<{
  title: string;
  children: ReactNode;
  backgroundImage: string;
}> = ({ backgroundImage, title, children }) => {
  return (
    <Container>
      <Title backgroundImage={backgroundImage}>
        <div>{title}</div>
      </Title>
      {children}
    </Container>
  );
};

const Title = styled.div<{ backgroundImage: string }>`
  width: 100%;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  background-image: ${({ backgroundImage }) => backgroundImage};
  font-size: 28px;
  font-weight: bold;
  color: #fff;
`;

const Container = styled.div`
  margin-top: 10px;
  width: 615px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
  background-color: #eee;
  margin-bottom: 0px;
  overflow: hidden;
`;

export default SimpleContainer;
