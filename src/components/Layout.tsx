import React, { FC, ReactNode } from "react";
import Header from "./Header";
import Menu from "./Menu";
import styled from "@emotion/styled";

const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div>
      <Header />
      <Menu />
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
