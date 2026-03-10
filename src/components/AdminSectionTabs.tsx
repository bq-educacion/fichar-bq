import styled from "@emotion/styled";
import Link from "next/link";
import React, { FC } from "react";

const sections = [
  { key: "projects", label: "Proyectos", href: "/admin/projects" },
  { key: "users", label: "Usuarios", href: "/admin/users" },
] as const;

const AdminSectionTabs: FC<{ active: "projects" | "users"; maxWidth?: string }> = ({
  active,
  maxWidth = "615px",
}) => {
  return (
    <TabsContainer $maxWidth={maxWidth}>
      {sections.map((section) => (
        <Tab
          key={section.key}
          href={section.href}
          $active={active === section.key}
        >
          {section.label}
        </Tab>
      ))}
    </TabsContainer>
  );
};

const TabsContainer = styled.div<{ $maxWidth: string }>`
  width: ${({ $maxWidth }) => $maxWidth};
  max-width: 100%;
  margin-top: 20px;
  display: flex;
  background-color: #eee;
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid #e3e3e3;
`;

const Tab = styled(Link)<{ $active: boolean }>`
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 14px;
  font-weight: bold;
  color: #4e4f53;
  background: ${(props) => (props.$active ? "#fff" : "#eee")};
  border-right: 1px solid #fff;

  &:last-of-type {
    border-right: none;
  }

  &:hover {
    background: ${(props) => (props.$active ? "#fff" : "#e8e8e8")};
  }
`;

export default AdminSectionTabs;
