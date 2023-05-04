import { datetoHHMM } from "@/lib/utils";
import {
  LOG_TYPE,
  Log,
  USER_STATUS,
  User,
  UserStats as UserLogs,
} from "@/types";
import SimpleContainer from "@/ui/SimpleContainer";
import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";

const Colleagues: FC<{
  users: Omit<User, "isManager" | "active" | "manager" | "_id">[];
}> = ({ users }) => {
  return (
    <SimpleContainer
      title="Compañeros"
      backgroundImage="linear-gradient(256deg, #b68fbb, #ff5776)"
    >
      {users.map((user) => {
        return (
          <User key={`${user.email}-${user.status.date}`}>
            <Ball status={user.status.status}></Ball>
            <div>{user.name}</div>
            <div>{StatusType[user.status.status].text}</div>
          </User>
        );
      })}
    </SimpleContainer>
  );
};

const StatusType = {
  [USER_STATUS.working]: {
    text: "Trabajando",
    color: "#82ad3a",
  },
  [USER_STATUS.paused]: {
    text: "En una pausa",
    color: "#f6a001",
  },
  [USER_STATUS.error]: {
    text: "Error en el fichaje",
    color: "#4e4f53",
  },
  [USER_STATUS.finished]: {
    text: "Finalizado",
    color: "#4e4f53",
  },
  [USER_STATUS.not_started]: {
    text: "No iniciado",
    color: "#4e4f53",
  },
};

const User = styled.div`
  width: 100%;
  height: 40px;
  border-top: 1px solid #fff;
  font-size: 14px;
  color: #4e4f53;
  display: grid;
  grid-template-columns: 60px 100px 100px;
  gap: 10px;
  align-items: center;
  justify-items: center;
`;
const Ball = styled.div<{ status: USER_STATUS }>`
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background-color: ${(props) => StatusType[props.status].color};
`;

export default Colleagues;
