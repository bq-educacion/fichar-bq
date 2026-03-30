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

const LAST_LOGS_DAYS = 7;
type ManualMode = "overwrite" | "add";
type ProcessedDayLogs = {
  inputDate: string;
  date: Date;
  label: string;
  logs: Log[];
};

const toInputDateValue = (date: Date) =>
  `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date
    .getDate()
    .toString()
    .padStart(2, "0")}`;

const fromInputDateValue = (inputDate: string) => {
  const [year, month, day] = inputDate.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDisplayDate = (date: Date) =>
  date.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const isWeekday = (date: Date) => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

const processLogs = (logs: Log[], includeMissingWeekdays: boolean): ProcessedDayLogs[] => {
  const logsByDay = new Map<string, Log[]>();

  logs.forEach((log) => {
    const logDate = new Date(log.date);
    const inputDate = toInputDateValue(logDate);
    const dayLogs = logsByDay.get(inputDate) ?? [];
    dayLogs.push(log);
    logsByDay.set(inputDate, dayLogs);
  });

  logsByDay.forEach((dayLogs) => {
    dayLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  if (includeMissingWeekdays) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 0; offset < LAST_LOGS_DAYS; offset += 1) {
      const candidateDay = new Date(today);
      candidateDay.setDate(today.getDate() - offset);

      if (!isWeekday(candidateDay)) {
        continue;
      }

      const inputDate = toInputDateValue(candidateDay);
      if (!logsByDay.has(inputDate)) {
        logsByDay.set(inputDate, []);
      }
    }
  }

  return [...logsByDay.entries()]
    .map(([inputDate, dayLogs]) => {
      const date = fromInputDateValue(inputDate);
      return {
        inputDate,
        date,
        label: formatDisplayDate(date),
        logs: dayLogs,
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};

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
        setProcessedLogs(processLogs(logs, allowManualOverwrite));
      } else {
        console.error("Upload failed.");
      }
    }
  };

  const [processedLogs, setProcessedLogs] = useState<ProcessedDayLogs[]>(
    processLogs(logs, allowManualOverwrite)
  );
  const [manualTargetDate, setManualTargetDate] = useState<string | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualMode, setManualMode] = useState<ManualMode>("overwrite");

  useEffect(() => {
    setProcessedLogs(processLogs(logs, allowManualOverwrite));
  }, [allowManualOverwrite, logs]);

  const closeManualModal = () => {
    setManualModalOpen(false);
    setManualTargetDate(null);
    setManualMode("overwrite");
  };

  const openManualOverwriteForDay = (day: ProcessedDayLogs) => {
    if (day.logs.length === 0) {
      return;
    }

    setManualMode("overwrite");
    setManualTargetDate(day.inputDate);
    setManualModalOpen(true);
  };

  const openManualAddForDay = (day: ProcessedDayLogs) => {
    if (day.logs.length > 0) {
      return;
    }

    setManualMode("add");
    setManualTargetDate(day.inputDate);
    setManualModalOpen(true);
  };

  const submitManualForDay = async (data: ManualLogsData) => {
    const res = await fetch("/api/manualLogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.status !== 200) {
      return;
    }

    closeManualModal();
    await refreshLogs?.();
  };

  const inputFileRefs = useRef<{
    [key: string]: HTMLInputElement;
  }>({});

  if (processedLogs.length === 0) {
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
          onClose={closeManualModal}
          onSubmit={submitManualForDay}
          targetDate={manualTargetDate ?? undefined}
          showDedications={manualMode === "add"}
          preserveProjectDedications={manualMode === "overwrite"}
        />
      )}
      <DisplayContent
        opened={true}
        bold={true}
        title="Registro de fichajes (últimos 7 días)"
      >
        <Container>
          {processedLogs.map((day, index) => {
            const dayLogs = day.logs;
            // first letter of key in upper case
            const title = day.label.charAt(0).toUpperCase() + day.label.slice(1);
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
                key={day.inputDate}
                title={title_full}
                bold={false}
                rightContent={
                  allowManualOverwrite ? (
                    dayLogs.length === 0 ? (
                      <AddButton onClick={() => openManualAddForDay(day)}>Añadir</AddButton>
                    ) : (
                      <OverwriteButton onClick={() => openManualOverwriteForDay(day)}>
                        Sobrescribir
                      </OverwriteButton>
                    )
                  ) : undefined
                }
              >
                {dayLogs.length === 0 ? (
                  <EmptyDayMessage>Sin fichajes registrados</EmptyDayMessage>
                ) : (
                  dayLogs.map((log) => (
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
                  ))
                )}
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

const OverwriteButton = styled.button`
  height: 26px;
  padding: 0 10px;
  margin-right: 10px;
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

const AddButton = styled.button`
  height: 26px;
  padding: 0 10px;
  margin-right: 10px;
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

const EmptyDayMessage = styled.div`
  border-top: 1px solid #fff;
  width: 100%;
  min-height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 13px;
  color: #6d6e72;
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
