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
      title="Estado de mis compañeros"
      textColor="#4e4f53"
      fontSize="14px"
      height="40px"
      backgroundImage="linear-gradient(220deg, #eee, #eee)"
    >
      <Container rows={users.length}>
        {users.map((user) => {
          return (
            <React.Fragment key={`${user.email}-${user.status.date}`}>
              <div>
                <Status status={user.status.status}>
                  <Ball status={user.status.status}></Ball>
                </Status>
              </div>
              <UserName>{user.name}</UserName>
              <UserStatus status={user.status.status}>
                <div>{StatusType[user.status.status].text}</div>
              </UserStatus>
              <Time>
                <span>
                  {user.status.status !== USER_STATUS.not_started ? (
                    <>{datetoHHMM(new Date(user.status.date!))}</>
                  ) : (
                    <>- : -</>
                  )}
                </span>
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
    border: "#82ad3a",
  },
  [USER_STATUS.paused]: {
    text: "Pausa",
    color: "#f6a001",
    border: "#f6a001",
  },
  [USER_STATUS.error]: {
    text: "Error en el fichaje",
    color: "#4e4f53",
    border: "#4e4f53",
  },
  [USER_STATUS.finished]: {
    text: "Finalizado",
    color: "#4e4f53",
    border: "#4e4f53",
  },
  [USER_STATUS.not_started]: {
    text: "No iniciado",
    color: "#eee",
    border: "#a0a0a3",
    textColor: "#a0a0a3",
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
const UserStatus = styled.div<{ status: USER_STATUS }>`
  height: 100%;
  width: 100%;
  border-bottom: 1px solid #fff;
  display: flex;
  justify-content: end;
  align-items: center;
  color: #fff;
  div {
    background-color: ${(props) => `${StatusType[props.status].color}`};
    padding: 5px;
    border: 1px solid ${(props) => `${StatusType[props.status].border}`};
    color: ${(props) =>
      `${(StatusType[props.status] as any).textColor || "inherit"}`};
  }
`;
const Time = styled.div`
  height: 100%;
  width: 100%;
  border-bottom: 1px solid #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  span {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 57px;
    height: 35px;
    background-color: #fff;
    // bold
    font-weight: bold;
    font-size: 14px;
    font-weight: bold;
    color: #4e4f53;
  }
`;
const Status = styled.div<{ status: USER_STATUS }>`
  height: 100%;
  width: 100%;
  border-bottom: 1px solid #fff;
  display: flex;
  flex-direction: row;
  justify-content: start;
  align-items: center;
  border-left: 3px solid ${(props) => `${StatusType[props.status].color}`};
`;
const Ball = styled.div<{ status: USER_STATUS }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-left: 25px;
  background-color: ${(props) => StatusType[props.status].color};
  border: 1px solid ${(props) => StatusType[props.status].border};
`;

const Container = styled.div<{ rows: number }>`
  display: grid;
  row-gap: 1px;
  grid-template-columns: 60px 250px 1fr 1fr;
  grid-template-rows: ${(props) => `repeat(${props.rows}, 60px)`};
  width: 100%;
  border-top: 2px solid #fff;
  font-size: 14px;
  color: #4e4f53;
`;

export default Colleagues;
