import { datetoHHMM, decimalToHours, getHoursToday } from "@/lib/utils";
import { LOG_TYPE, Log, USER_STATUS, UserStats as UserLogs } from "@/types";
import DisplayContent from "@/ui/DisplayContent";
import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";
import IconError from "@/assets/icons/icon-close.svg";
import IconPause from "@/assets/icons/icon-munukebab.svg";
import IconOut from "@/assets/icons/icon-left-arrow.svg";
import IconIn from "@/assets/icons/icon-right-arrow.svg";
import IconEdit from "@/assets/icons/icon-edit.svg";
import IconTick from "@/assets/icons/icon-tick.svg";

const EditErrorLog: FC<{ log: Log }> = ({ log }) => {
  const [text, setText] = useState<string>(log.error_text || "");
  const [hours, setHours] = useState<number>(log.error_hours || 0);
  const [editing, setEditing] = useState<boolean>(false);

  const updateLog = async () => {
    const response = await fetch(`/api/assestError`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        _id: log._id,
        error_text: text,
        error_hours: hours,
      }),
    });
    if (response.status === 200) {
      setEditing(false);
    } else {
      alert("Error al actualizar el log");
    }
  };

  return (
    <EditingContainer>
      <Input
        disabled={!editing}
        type="time"
        value={`${
          Math.floor(hours) < 10 ? `0${Math.floor(hours)}` : Math.floor(hours)
        }:${
          Math.round((hours - Math.floor(hours)) * 60) < 10
            ? `0${Math.round((hours - Math.floor(hours)) * 60)}`
            : Math.round((hours - Math.floor(hours)) * 60)
        }`}
        onChange={(e) => {
          const [hh, mm] = e.target.value.split(":");
          setHours(parseInt(hh) + parseInt(mm) / 60);
        }}
      />

      <Input
        disabled={!editing}
        type="text"
        width="245px"
        value={text}
        placeholder={log.error_text || "motivo del error"}
        onChange={(e) => setText(e.target.value)}
      />

      {editing ? (
        <IconTick onClick={() => updateLog()} />
      ) : (
        <IconEdit onClick={() => setEditing(true)} />
      )}
    </EditingContainer>
  );
};

const Input = styled("input")<{ width?: string }>`
  border: none;
  outline: none;
  background-color: transparent;
  color: #3d3e42;
  font-style: italic;
  margin-right: 10px;
  height: 35px;
  padding: 0px 10px 0 10px;
  width: ${(props) => props.width};
  // white backgorund on editing
  &:enabled {
    background-color: white;
  }
  text-overflow: ellipsis;
`;

const EditingContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  height: 100%;
  svg {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }
`;

const UserLogsComponentViewer: FC<{ logs: Log[] }> = ({ logs }) => {
  const processLogs = (logs: Log[]) => {
    const processedLogs = logs.reduce((acc, log) => {
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

    // if a day has an error, keep only the error
    const simplifiedLogs: { [key: string]: Log[] } = {};
    for (const key in processedLogs) {
      const errorLog = processedLogs[key].find(
        (log) => log.type === LOG_TYPE.error
      );
      if (errorLog) {
        simplifiedLogs[key] = [errorLog];
      } else {
        simplifiedLogs[key] = [...processedLogs[key]];
      }
    }
    return simplifiedLogs;
  };
  const [processedLogs, setProcessedLogs] = useState<{ [key: string]: Log[] }>({
    ...processLogs(logs),
  });

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
    <DisplayContent
      opened={true}
      bold={true}
      title="Registro de fichajes (últimos 7 días)"
    >
      <Container>
        {Object.keys(processedLogs).map((key, index) => {
          // first letter of key in upper case
          const title = key.charAt(0).toUpperCase() + key.slice(1);
          // title and number of hours worked (except if there is an error)
          const title_full = `${title} ${
            !processedLogs[key].some((log) => log.type === LOG_TYPE.error)
              ? `(${decimalToHours(
                  getHoursToday(
                    processedLogs[key].map((log) => ({
                      ...log,
                      date: new Date(log.date),
                    }))
                  )
                )})
            `
              : ""
          }`;
          return (
            <DisplayContent
              opened={index === 0}
              key={key}
              title={title_full}
              bold={false}
            >
              <>
                {processedLogs[key].map((log) => (
                  <Log key={log._id.toString()}>
                    <Icon color={LogIcon[log.type].color}>
                      {LogIcon[log.type].icon}
                    </Icon>
                    <div>{LogType[log.type]}</div>
                    {log.type !== LOG_TYPE.error ? (
                      <div>{datetoHHMM(new Date(log.date))}</div>
                    ) : (
                      <EditErrorLog log={log} />
                    )}
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

export default UserLogsComponentViewer;
