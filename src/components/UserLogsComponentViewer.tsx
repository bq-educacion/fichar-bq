import { datetoHHMM, decimalToHours, getHoursToday } from "@/lib/utils";
import { LOG_NOTES, LOG_TYPE, Log } from "@/types";
import DisplayContent from "@/ui/DisplayContent";
import styled from "@emotion/styled";
import React, { FC, useEffect, useRef, useState } from "react";
import IconError from "@/assets/icons/icon-close.svg";
import IconPause from "@/assets/icons/icon-munukebab.svg";
import IconOut from "@/assets/icons/icon-left-arrow.svg";
import IconIn from "@/assets/icons/icon-right-arrow.svg";
import IconEdit from "@/assets/icons/icon-edit.svg";
import IconTick from "@/assets/icons/icon-tick.svg";
import IconMobile from "@/assets/icons/smartphone-icon.svg";
import IconDoctor from "@/assets/icons/icon-doctor.svg";

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
  const createRefs = (
    logs: Log[]
  ): {
    [key: string]: React.RefObject<HTMLInputElement>;
  } => {
    const refs: { [key: string]: React.RefObject<HTMLInputElement> } = {};
    for (let log of logs) {
      refs[log._id.toString()] = useRef<HTMLInputElement>(null);
    }
    return refs;
  };

  const onUpload = async (
    inputFileRef: React.RefObject<HTMLInputElement>,
    log: Log,
    logs: Log[]
  ) => {
    if (inputFileRef.current && inputFileRef.current.files) {
      const file = inputFileRef.current.files[0];
      // encode email as valid folder name removing what is after @
      const path = log.user.split("@")[0].split(".").join("_");
      const filename = `${path}/${log._id}/${encodeURIComponent(file.name)}`;
      inputFileRef.current.value = "";
      const res = await fetch(`/api/upload-url?file=${filename}`);
      const { url, fields } = await res.json();
      const formData = new FormData();
      Object.entries({ ...fields, file }).forEach(([key, value]) => {
        formData.append(key, value as string);
      });

      const upload = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (upload.ok) {
        // attach upload url to log through api
        const res = await fetch(`/api/logDoctorFile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            _id: log._id,
            logFile: `${url}/${filename}`,
          }),
        });

        console.log("Uploaded successfully!");

        // refresh logs

        const updatedLog = logs.find((l) => l._id === log._id);

        updatedLog!.note = LOG_NOTES.doctor;
        updatedLog!.logFile = `${url}/${filename}`;
        setProcessedLogs({ ...processLogs(logs) });
      } else {
        console.error("Upload failed.");
      }
    }
  };

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

  const inputFileRefs = createRefs(logs);

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
                    {log.type !== LOG_TYPE.error && (
                      <Time>
                        {datetoHHMM(new Date(log.date))}
                        {log.isMobile && <IconMobile />}
                        {log.type === LOG_TYPE.pause && (
                          <Doctor
                            data-tooltip="Adjunta justificante médico de la Seguridad Social"
                            active={log.note === LOG_NOTES.doctor}
                            onClick={() => {
                              if (log.note !== LOG_NOTES.doctor) {
                                inputFileRefs[
                                  log._id.toString()
                                ].current?.click();
                              }
                            }}
                          >
                            <IconDoctor />

                            <input
                              type="file"
                              ref={inputFileRefs[log._id.toString()]}
                              onChange={() => {
                                onUpload(
                                  inputFileRefs[log._id.toString()],
                                  log,
                                  logs
                                );
                              }}
                            />
                          </Doctor>
                        )}
                      </Time>
                    )}
                    {log.type === LOG_TYPE.error && <EditErrorLog log={log} />}
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
    //height: 16px;
    margin: 0 12px 0 12px;
  }
`;

const Doctor = styled.span<{ active: boolean }>`
  position: relative; /* making the .tooltip span a container for the tooltip text */
  input {
    display: none;
  }

  cursor: ${(props) => (props.active ? "default" : "pointer")};
  svg {
    width: 16px;
    //height: 16px;
    margin: 2px 12px 0 12px;
    color: ${(props) => (props.active ? "#ff0000" : "#a1a2a5")};
  }

  &:hover::before {
    display: ${(props) => (props.active ? "none" : "block")};
  }

  &::before {
    content: attr(data-tooltip);
    position: absolute;

    top: 50%;
    transform: translateY(-50%);

    left: 100%;
    margin-left: 10px;

    width: 200px;
    padding: 10px;
    border-radius: 10px;
    //background: #000;
    color: #4e4f53;
    text-align: center;
    font-size: 14px;
    border: 1px solid #4e4f53;
    border-radius: 10px;

    display: none;
  }
`;

const Time = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  svg {
    color: #4e4f53;
    margin-left: 10px;
    height: 20px;
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
