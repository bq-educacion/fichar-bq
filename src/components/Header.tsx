import React from "react";
import styled from "@emotion/styled";
import BQLogo from "@/assets/bq-logo.svg";

const Header = () => {
  return (
    <HeaderDiv>
      <BQLogo />
    </HeaderDiv>
  );
};

const HeaderDiv = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 120px;
  background-color: #434242;
  svg {
    margin: 25px 0px 45px 0px;
    cursor: pointer;
    height: 32px;
  }
`;

export default Header;
