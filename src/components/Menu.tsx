import React, { FC, useEffect, useState } from "react";
import IconClock from "@/assets/icons/icon-clock.svg";
import IconPalm from "@/assets/icons/icon-palm.svg";
import IconTeam from "@/assets/icons/icon-team.svg";
import IconBrainup from "@/assets/icons/icon-brainup.svg";
import styled from "@emotion/styled";
import Link from "next/link";
import { useRouter } from "next/router";

type MenuItems = {
  icon: React.ReactNode;
  text: string;
  link: string;
};

const Menu: FC = () => {
  const router = useRouter();

  const buildMenuItems = (flags: { isManager: boolean; admin: boolean }) => {
    const items: MenuItems[] = [
      {
        icon: <IconClock />,
        text: "Fichar",
        link: "/",
      },
      {
        icon: <IconTeam />,
        text: "Compañeros",
        link: "/colleagues",
      },
    ];

    if (flags.isManager) {
      items.push({
        icon: <IconPalm />,
        text: "Mi equipo",
        link: "/manager",
      });
    }

    if (flags.admin) {
      items.push({
        icon: <IconBrainup />,
        text: "Admin",
        link: "/admin/projects",
      });
    }

    return items;
  };

  useEffect(() => {
    const fetchUser = async () => {
      const response = await fetch(`/api/me`, {
        method: "GET",
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setMenuItems(
        buildMenuItems({
          isManager: Boolean(data.isManager),
          admin: Boolean(data.admin),
        })
      );
    };
    fetchUser();
  }, []);

  const [menuItems, setMenuItems] = useState<MenuItems[]>(
    buildMenuItems({ isManager: false, admin: false })
  );

  const isSelected = (link: string) => {
    if (link === "/manager") {
      return router.pathname === "/manager" || router.pathname.startsWith("/worker/");
    }

    if (link === "/admin/projects") {
      return router.pathname.startsWith("/admin");
    }

    return router.pathname === link;
  };

  return (
    <MenuContainer>
      {menuItems.map((item, index) => (
        <MenuItem
          items={menuItems.length}
          href={item.link}
          key={index}
          selected={isSelected(item.link)}
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

const MenuItem = styled(Link)<{
  selected: boolean;
  items: number;
}>`
  display: flex;
  flex: 0 0 ${(props) => 100 / props.items}%;
  flex-direction: row;
  align-items: center;
  height: 50px;
  text-decoration: none;
  cursor: pointer;
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
