import React, { FC, ReactNode } from "react";
import Header from "./Header";
import Menu from "./Menu";
import styled from "@emotion/styled";

const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <FullLayout>
      <Header />
      <Menu />
      <Container>{children}</Container>
      <Footer>
        © Educación y Robótica, S.L, 2023.
        <br />
        Todos los derechos reservados
      </Footer>
    </FullLayout>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const FullLayout = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const Footer = styled.div`
  font-size: 14px;
  text-align: center;
  color: #4e4f53;
  margin-top: 10px;
  margin-bottom: 20px;
`;

export default Layout;
