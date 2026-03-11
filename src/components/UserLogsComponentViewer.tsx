import { datetoHHMM, decimalToHours, getHoursToday } from "@/lib/utils";
import { LOG_NOTES, LOG_TYPE, Log } from "@/types";
import DisplayContent from "@/ui/DisplayContent";
import styled from "@emotion/styled";
import React, { FC, useEffect, useRef, useState } from "react";
import IconPause from "@/assets/icons/icon-munukebab.svg";
import IconOut from "@/assets/icons/icon-left-arrow.svg";
import IconIn from "@/assets/icons/icon-right-arrow.svg";
import IconMobile from "@/assets/icons/smartphone-icon.svg";
import IconDoctor from "@/assets/icons/icon-doctor.svg";
import IconManual from "@/assets/icons/icon-manual.svg";
import ManualLogsModal, { ManualLogsData } from "./ManualLogsModal";

const toInputDateValue = (date: Date) =>
  `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date
    .getDate()
    .toString()
    .padStart(2, "0")}`;

const UserLogsComponentViewer: FC<{
  logs: Log[];
  refreshLogs?: () => Promise<void> | void;
  allowManualOverwrite?: boolean;
}> = ({ logs, refreshLogs, allowManualOverwrite = false }) => {
  const onUpload = async (
    inputFileRef: HTMLInputElement,
    log: Log,
    logs: Log[]
  ) => {
    if (inputFileRef && inputFileRef.files) {
      const file = inputFileRef.files[0];
      // encode email as valid folder name removing what is after @
      const path = log.user.split("@")[0].split(".").join("_");
      // filename extension
      const extension = file.name.split(".").pop();
      const filename = `${path}/${log._id}.${extension}`;
      inputFileRef.value = "";
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
            logFile: `${url}${filename}`,
          }),
        });

        // refresh logs

        const updatedLog = logs.find((l) => l._id === log._id);

        updatedLog!.note = LOG_NOTES.doctor;
        updatedLog!.logFile = `${url}${filename}`;
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

    return processedLogs;
  };
  const [processedLogs, setProcessedLogs] = useState<{ [key: string]: Log[] }>({
    ...processLogs(logs),
  });
  const [manualTargetDate, setManualTargetDate] = useState<string | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);

  useEffect(() => {
    setProcessedLogs({ ...processLogs(logs) });
  }, [logs]);

  const openManualOverwriteForDay = (dayLogs: Log[]) => {
    if (dayLogs.length === 0) {
      return;
    }

    const targetDate = toInputDateValue(new Date(dayLogs[0].date));
    setManualTargetDate(targetDate);
    setManualModalOpen(true);
  };

  const submitManualOverwriteForDay = async (data: ManualLogsData) => {
    const res = await fetch("/api/manualLogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        preserveProjectDedications: true,
        projectDedications: [],
      }),
    });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.status !== 200) {
      return;
    }

    setManualModalOpen(false);
    setManualTargetDate(null);
    await refreshLogs?.();
  };

  const inputFileRefs = useRef<{
    [key: string]: HTMLInputElement;
  }>({});

  if (Object.keys(processedLogs).length === 0) {
    return null;
  }

  const LogType = {
    [LOG_TYPE.in]: "Entrada",
    [LOG_TYPE.out]: "Salida",
    [LOG_TYPE.pause]: "Pausa",
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
    [LOG_TYPE.goback]: {
      color: "#82ad3a",
      icon: <IconIn />,
    },
  };

  return (
    <>
      {allowManualOverwrite && (
        <ManualLogsModal
          isOpen={manualModalOpen}
          onClose={() => {
            setManualModalOpen(false);
            setManualTargetDate(null);
          }}
          onSubmit={submitManualOverwriteForDay}
          targetDate={manualTargetDate ?? undefined}
          showDedications={false}
          preserveProjectDedications={true}
        />
      )}
      <DisplayContent
        opened={true}
        bold={true}
        title="Registro de fichajes (últimos 7 días)"
      >
        <Container>
          {Object.keys(processedLogs).map((key, index) => {
            const dayLogs = processedLogs[key];
            // first letter of key in upper case
            const title = key.charAt(0).toUpperCase() + key.slice(1);
            // title and number of hours worked (except if there is an error)
            const title_full = `${title} (${decimalToHours(
              getHoursToday(
                dayLogs.map((log) => ({
                  ...log,
                  date: new Date(log.date),
                }))
              )
            )})`;
            return (
              <DisplayContent
                opened={index === 0}
                key={key}
                title={title_full}
                bold={false}
              >
                <>
                  {allowManualOverwrite && (
                    <DayActions>
                      <OverwriteButton onClick={() => openManualOverwriteForDay(dayLogs)}>
                        Sobrescribir fichajes del día
                      </OverwriteButton>
                    </DayActions>
                  )}
                  {dayLogs.map((log) => (
                    <Log key={log._id.toString()}>
                      <Icon color={LogIcon[log.type].color}>
                        {LogIcon[log.type].icon}
                      </Icon>
                      <div>{LogType[log.type]}</div>
                      <Time>
                        {datetoHHMM(new Date(log.date))}
                        {log.manual && (
                          <ManualBadge title="Fichaje manual">
                            <IconManual />
                          </ManualBadge>
                        )}
                        {log.isMobile && <IconMobile />}
                      </Time>
                    </Log>
                  ))}
                </>
              </DisplayContent>
            );
          })}
        </Container>
      </DisplayContent>
    </>
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

  cursor: ${(props) => (props.active ? "pointer" : "pointer")};
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

const DayActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid #fff;
`;

const OverwriteButton = styled.button`
  height: 30px;
  padding: 0 10px;
  border: 1px solid #434242;
  border-radius: 4px;
  background: transparent;
  color: #434242;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: #dfdfde;
  }
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

const ManualBadge = styled.span`
  display: inline-flex;
  align-items: center;
  svg {
    width: 14px;
    height: 14px;
    margin-left: 6px;
    color: #8a4d92;
  }
`;

export default UserLogsComponentViewer;
