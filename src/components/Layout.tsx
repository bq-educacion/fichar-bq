import React, { FC, ReactNode } from "react";
import Header from "./Header";
import Menu from "./Menu";
import styled from "@emotion/styled";

const Layout: FC<{ children: ReactNode; active: number }> = ({
  children,
  active,
}) => {
  return (
    <div>
      <Header />
      <Menu active={active} />
      <Container>{children}</Container>
    </div>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export default Layout;
