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
      <Container rows={users.length}>
        {users.map((user) => {
          return (
            <React.Fragment key={`${user.email}-${user.status.date}`}>
              <Status>
                <Ball status={user.status.status}></Ball>
              </Status>
              <UserName>{user.name}</UserName>
              <UserStatus>{StatusType[user.status.status].text}</UserStatus>
              <Time>
                {user.status.status !== USER_STATUS.not_started && (
                  <>{datetoHHMM(new Date(user.status.date!))}</>
                )}
              </Time>
            </React.Fragment>
          );
        })}
      </Container>
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

const Name = styled.div``;

const UserName = styled.div`
  font-weight: bold;
  height: 100%;
  width: 100%;
  border-bottom: 1px solid #fff;
  display: flex;
  justify-content: start;
  align-items: center;
`;
const UserStatus = styled.div`
  height: 100%;
  width: 100%;
  border-bottom: 1px solid #fff;
  display: flex;
  justify-content: start;
  align-items: center;
`;
const Time = styled.div`
  height: 100%;
  width: 100%;
  border-bottom: 1px solid #fff;
  display: flex;
  justify-content: start;
  align-items: center;
`;
const Status = styled.div`
  height: 100%;
  width: 100%;
  border-bottom: 1px solid #fff;
  display: flex;
  justify-content: center;
  align-items: center;
`;
const Ball = styled.div<{ status: USER_STATUS }>`
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background-color: ${(props) => StatusType[props.status].color};
`;

const Container = styled.div<{ rows: number }>`
  display: grid;
  grid-template-columns: 60px 250px 1fr 1fr;
  grid-template-rows: ${(props) => `repeat(${props.rows}, 40px)`};
  width: 100%;
  border-top: 2px solid #fff;
  font-size: 14px;
  color: #4e4f53;
`;

export default Colleagues;
