import React, { FC, ReactNode } from "react";
import IconDirection from "@/assets/icons/icon-direction.svg";
import styled from "@emotion/styled";

const SimpleContainer: FC<{
  title: string;
  textColor: string;
  fontSize: string;
  height: string;
  children: ReactNode;
  backgroundImage: string;
  maxWidth?: string;
}> = ({
  backgroundImage,
  title,
  children,
  textColor,
  fontSize,
  height,
  maxWidth = "615px",
}) => {
  return (
    <Container $maxWidth={maxWidth}>
      <Title
        backgroundImage={backgroundImage}
        textColor={textColor}
        fontSize={fontSize}
        height={height}
      >
        <div>{title}</div>
      </Title>
      {children}
    </Container>
  );
};

const Title = styled.div<{
  backgroundImage: string;
  textColor: string;
  fontSize: string;
  height: string;
}>`
  width: 100%;
  height: ${({ height }) => height};
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  background-image: ${({ backgroundImage }) => backgroundImage};
  font-size: ${({ fontSize }) => fontSize};
  color: ${({ textColor }) => textColor};
`;

const Container = styled.div<{ $maxWidth: string }>`
  margin-top: 40px;
  width: ${({ $maxWidth }) => $maxWidth};
  max-width: 100%;
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
