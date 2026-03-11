import React, { FC, ReactNode } from "react";
import IconDirection from "@/assets/icons/icon-direction.svg";
import styled from "@emotion/styled";

const DisplayContent: FC<{
  opened: boolean;
  title: string;
  bold: boolean;
  children: ReactNode;
  rightContent?: ReactNode;
}> = ({ opened, title, children, bold, rightContent }) => {
  const [show, setShow] = React.useState<boolean>(opened);
  return (
    <Container>
      <Title bold={bold}>
        <IconBox show={show} bold={bold}>
          <IconDirection onClick={() => setShow(!show)} />
        </IconBox>
        <TitleText>{title}</TitleText>
        {rightContent && <RightContent>{rightContent}</RightContent>}
      </Title>
      {show && children}
    </Container>
  );
};

const Title = styled.div<{ bold: boolean }>`
  width: 100%;
  height: 39px;
  display: flex;
  justify-content: start;
  align-items: center;
  flex-direction: row;
  gap: 1px;
  background-color: #eee;
  font-size: 14px;
  font-weight: ${({ bold }) => (bold ? "bold" : "normal")};
  color: #4e4f53;
`;

const IconBox = styled.div<{ show: boolean; bold: boolean }>`
  width: 40px;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  border-right: ${({ bold }) => (bold ? "1px solid #fff" : "none")};
  margin-right: ${({ bold }) => (bold ? "10px" : "opx")};
  svg {
    width: 20px;
    height: 20px;
    transform: ${({ show }) => (show ? "rotate(0deg)" : "rotate(-90deg)")};
  }
`;

const TitleText = styled.div`
  flex: 1;
  min-width: 0;
`;

const RightContent = styled.div`
  display: flex;
  align-items: center;
  padding-right: 12px;
  padding-left: 10px;
`;

const Container = styled.div`
  margin-top: 10px;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
  background-color: #eee;
  margin-bottom: 0px;
  overflow: hidden;
  /* // last of type
  &:last-of-type {
    margin-bottom: 30px;
  } */
`;

export default DisplayContent;
