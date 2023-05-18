import styled from "@emotion/styled";
import { FC } from "react";
import LogoGoogle from "@/assets/icons/logo-google.svg";

const GoogleButton: FC<{ onClick: (e: React.MouseEvent) => void }> = ({
  onClick,
}) => {
  return (
    <GButton onClick={(e) => onClick(e)}>
      <LogoGoogle />
    </GButton>
  );
};

const GButton = styled.button`
  display: flex;
  border: solid 1px #3d3e42;
  justify-content: center;
  align-items: center;
  width: 313px;
  height: 40px;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;

  &:hover {
    border: solid 1px #f2f2f3;
  }

  svg {
    height: 30px;
  }
`;

export default GoogleButton;
