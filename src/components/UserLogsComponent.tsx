import { datetoHHMM, decimalToHours } from "@/lib/utils";
import { LOG_TYPE, Log, USER_STATUS, UserStats as UserLogs } from "@/types";
import DisplayContent from "@/ui/DisplayContent";
import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";
import IconError from "@/assets/icons/icon-close.svg";
import IconPause from "@/assets/icons/icon-munukebab.svg";
import IconOut from "@/assets/icons/icon-left-arrow.svg";
import IconIn from "@/assets/icons/icon-right-arrow.svg";

const UserLogsComponent: FC<{ status: USER_STATUS }> = ({ status }) => {
  const processLogs = (logs: Log[]) =>
    logs.reduce((acc, log) => {
      const date = new Date(log.date);
      // key is readable date in spanish
      const key = date.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key] = [log, ...acc[key]];
      return acc;
    }, {} as { [key: string]: Log[] });

  const [processedLogs, setProcessedLogs] = useState<{ [key: string]: Log[] }>(
    {}
  );
  const fetchUserLogs = async () => {
    const response = await fetch(`/api/userLogs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ numberofdays: 7, page: 1 }),
    });
    const data = await response.json();
    setProcessedLogs(processLogs(data));
  };

  useEffect(() => {
    fetchUserLogs();
  }, [status]);

  if (Object.keys(processedLogs).length === 0) {
    return null;
  }

  const LogType = {
    [LOG_TYPE.in]: "Entrada",
    [LOG_TYPE.out]: "Salida",
    [LOG_TYPE.pause]: "Pausa",
    [LOG_TYPE.error]: "Error",
    [LOG_TYPE.goback]: "Entrada",
  };

  const LogIcon = {
    [LOG_TYPE.in]: {
      color: "#82ad3a",
      icon: <IconIn />,
    },
    [LOG_TYPE.out]: {
      color: " #e4002b",
      icon: <IconOut />,
    },
    [LOG_TYPE.pause]: {
      color: "#f6a001",
      icon: <IconPause />,
    },
    [LOG_TYPE.error]: {
      color: "#4e4f53",
      icon: <IconError />,
    },
    [LOG_TYPE.goback]: {
      color: "#82ad3a",
      icon: <IconIn />,
    },
  };

  return (
    <DisplayContent bold={true} title="Registro de fichajes (últimos 7 días)">
      <Container>
        {Object.keys(processedLogs).map((key) => {
          // first letter of key in upper case
          const title = key.charAt(0).toUpperCase() + key.slice(1);
          return (
            <DisplayContent key={key} title={title} bold={false}>
              <>
                {processedLogs[key].map((log) => (
                  <Log key={log._id.toString()}>
                    <Icon color={LogIcon[log.type].color}>
                      {LogIcon[log.type].icon}
                    </Icon>
                    <div>{LogType[log.type]}</div>
                    <div>{datetoHHMM(new Date(log.date))}</div>
                  </Log>
                ))}
              </>
            </DisplayContent>
          );
        })}
      </Container>
    </DisplayContent>
  );
};

const Icon = styled.div<{ color: string }>`
  color: ${(props) => props.color};
  svg {
    width: 16px;
    height: 16px;
    margin: 0 12px 0 12px;
  }
`;

const Container = styled.div`
  border-top: 2px solid #fff;
  width: 100%;
  overflow: visible;
  padding-left: 23px;
`;

const Log = styled.div`
  display: grid;
  width: 100%;
  height: 60px;
  grid-template-columns: 60px 100px auto;
  border-top: 1px solid #fff;
  font-size: 14px;
  color: #4e4f53;
  align-items: center;
`;

export default UserLogsComponent;
