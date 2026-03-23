import React, { FC, ReactNode } from "react";
import Header from "./Header";
import Menu from "./Menu";
import styled from "@emotion/styled";
import SiteFooter from "./SiteFooter";

const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <FullLayout>
      <Header />
      <Menu />
      <Container>{children}</Container>
      <SiteFooter />
    </FullLayout>
  );
};

const Container = styled.div`
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const FullLayout = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

export default Layout;
