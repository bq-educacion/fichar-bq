import React, { FC, ReactNode } from "react";
import IconDirection from "@/assets/icons/icon-direction.svg";
import styled from "@emotion/styled";

const DisplayContent: FC<{ title: string; children: ReactNode }> = ({
  title,
  children,
}) => {
  const [show, setShow] = React.useState<boolean>(true);
  return (
    <Container>
      <Title>
        <IconBox show={show}>
          <IconDirection onClick={() => setShow(!show)} />
        </IconBox>
        <div>{title}</div>
      </Title>
      {show && children}
    </Container>
  );
};

const Title = styled.div`
  width: 100%;
  height: 39px;
  display: flex;
  justify-content: start;
  align-items: center;
  flex-direction: row;
  gap: 1px;
  background-color: #eee;
  font-size: 14px;
  font-weight: bold;
  color: #4e4f53;
`;

const IconBox = styled.div<{ show: boolean }>`
  width: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  svg {
    width: 20px;
    height: 20px;
    transform: ${({ show }) => (show ? "rotate(0deg)" : "rotate(-90deg)")};
  }
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
  margin-bottom: 20px;
  overflow: hidden;
`;

export default DisplayContent;
