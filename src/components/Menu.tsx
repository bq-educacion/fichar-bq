import React, { FC, useState } from "react";
import IconClock from "@/assets/icons/icon-clock.svg";
import IconPalm from "@/assets/icons/icon-palm.svg";
import IconTeam from "@/assets/icons/icon-team.svg";
import styled from "@emotion/styled";
import Link from "next/link";

type MenuItems = {
  icon: React.ReactNode;
  text: string;
  enabled: boolean;
  link?: string;
};

const menuItems: MenuItems[] = [
  {
    icon: <IconClock />,
    text: "Fichar",
    enabled: true,
    link: "/",
  },
  {
    icon: <IconTeam />,
    text: "Compañeros",
    enabled: true,
    link: "/colleagues",
  },
  {
    icon: <IconPalm />,
    text: "Mi equipo",
    enabled: true,
    link: "/manager",
  },
];

const Menu: FC = () => {
  const [selected, setSelected] = useState<number>(0);
  return (
    <MenuContainer>
      {menuItems.map((item, index) => (
        <MenuItem
          onClick={() => setSelected(index)}
          href={item.link || ""}
          //passHref={true}
          key={index}
          selected={index === selected}
          enabled={item.enabled}
        >
          {item.icon}
          <div>{item.text}</div>
        </MenuItem>
      ))}
    </MenuContainer>
  );
};

const MenuContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-basis: 100%;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: -15px;
`;

const MenuItem = styled(Link)<{ selected: boolean; enabled: boolean }>`
  display: flex;
  flex: 0 0 ${100 / menuItems.length}%;
  flex-direction: row;
  align-items: center;
  height: 50px;
  text-decoration: none;
  cursor: ${(props) => (props.enabled ? "pointer" : "not-allowed")};
  :first-of-type {
    border-top-left-radius: 10px;
  }
  :last-of-type {
    border-top-right-radius: 10px;
  }
  justify-content: center;
  background-color: ${(props) => (props.selected ? "#fff" : "#eee")};
  div {
    font-family: Roboto;
    font-weight: bold;
    font-size: 14px;
    line-height: 20px;
    text-transform: uppercase;
    color: #434242;
  }
  svg {
    width: 15.2px;
    height: 15.4px;
    margin: 0px 3px 3px 0px;
    color: #434242;
  }
`;

export default Menu;
