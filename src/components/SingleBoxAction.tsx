import { LOG_TYPE, UserStatus, USER_STATUS } from "@/types";
import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";
import IconClock from "@/assets/icons/icon-clock.svg";
import IconFork from "@/assets/icons/icon-fork-and-spoon.svg";
import IconCoputerOff from "@/assets/icons/icon-computer-off.svg";

import { useRouter } from "next/router";
import TimedButton from "../ui/TimedButton";
import { datetoHHMM, decimalToHours } from "@/lib/utils";
import getMobileDetect from "@/lib/getmobileDetect";
import ManualLogsModal, { ManualLogsData } from "./ManualLogsModal";

type UndoFeedbackState = "idle" | "loading" | "success" | "error";
type LogActivityErrorPayload = {
  code?: string;
  targetDate?: string;
  message?: string;
};

const SingleBoxAction: FC<{
  action: LOG_TYPE;
  status: UserStatus;
  refreshStatus: () => void;
}> = ({ action, status, refreshStatus }) => {
  const router = useRouter();
  const [clickable, setClickable] = useState<boolean>(true);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualTargetDate, setManualTargetDate] = useState<string | undefined>(
    undefined
  );
  const [manualWarningMessage, setManualWarningMessage] = useState<
    string | undefined
  >(undefined);
  const [undoState, setUndoState] = useState<UndoFeedbackState>("idle");
  const [undoMessage, setUndoMessage] = useState("");
  useEffect(() => {
    setClickable(true);
  }, [status]);

  useEffect(() => {
    if (!["success", "error"].includes(undoState)) return;

    const timeout = setTimeout(() => {
      setUndoState("idle");
      setUndoMessage("");
    }, 2500);

    return () => clearTimeout(timeout);
  }, [undoState]);

  const [time, setTime] = useState<string>(
    `${new Date().getHours()}:${
      new Date().getMinutes() < 10
        ? "0" + new Date().getMinutes()
        : new Date().getMinutes()
    }`
  );
  const [date, setDate] = useState<string>(
    new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

  const logActivity = async (type: LOG_TYPE) => {
    const device = getMobileDetect();
    return await fetch("/api/logActivity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, isMobile: device.isMobile }),
    });
  };

  const closeManualModal = () => {
    setManualModalOpen(false);
    setManualTargetDate(undefined);
    setManualWarningMessage(undefined);
  };

  const openDefaultManualModal = () => {
    setManualTargetDate(undefined);
    setManualWarningMessage(undefined);
    setManualModalOpen(true);
  };

  const handleLogActivity = async (type: LOG_TYPE) => {
    const res = await logActivity(type);
    if (res.status === 401) {
      router.push("/login");
      return false;
    }
    if (res.status === 409) {
      try {
        const payload = (await res.json()) as LogActivityErrorPayload;
        if (
          payload.code === "PREVIOUS_DAY_NOT_CLOSED" &&
          typeof payload.targetDate === "string"
        ) {
          setManualTargetDate(payload.targetDate);
          setManualWarningMessage(
            payload.message ||
              "La jornada del dia anterior quedo abierta. Corrigela manualmente antes de continuar."
          );
          setManualModalOpen(true);
          return false;
        }
      } catch {
        // ignore parse errors and fallback to generic feedback below
      }
    }
    if (res.status !== 200) {
      const rawMessage = await res.text();
      const cleanMessage = rawMessage.replace(/^Bad Request:\s*/i, "").trim();
      setUndoState("error");
      setUndoMessage(cleanMessage || "No se pudo registrar el fichaje");
      return false;
    }

    return true;
  };

  const removeLastLog = async () => {
    if (undoState === "loading") return;

    setUndoState("loading");
    setUndoMessage("Deshaciendo ultimo fichaje...");

    try {
      const res = await fetch("/api/removeLastLog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status !== 200) {
        const rawMessage = await res.text();
        const cleanMessage = rawMessage.replace(/^Bad Request:\s*/i, "").trim();
        setUndoState("error");
        setUndoMessage(cleanMessage || "No se pudo deshacer el fichaje");
        return;
      }

      setUndoState("success");
      setUndoMessage("Ultimo fichaje eliminado");
      setTimeout(() => refreshStatus(), 600);
    } catch {
      setUndoState("error");
      setUndoMessage("No se pudo deshacer el fichaje");
    }
  };

  const submitManualLogs = async (data: ManualLogsData) => {
    const res = await fetch("/api/manualLogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.status !== 200) {
      return;
    }
    closeManualModal();
    refreshStatus();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().getHours() + ":" + new Date().getMinutes());
      setDate(
        new Date().toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  let background = "";
  let buttonbakground = "";
  let iconbackground = "";
  let buttonText = "";
  let headerLine: JSX.Element | undefined = undefined;
  let subHeaderLine: JSX.Element | undefined = undefined;
  let icon: JSX.Element | undefined = undefined;
  switch (status.status) {
    case USER_STATUS.not_started:
      background = "linear-gradient(247deg, #8a4d92, #ff1842)";
      buttonbakground = "linear-gradient(256deg, #b68fbb, #ff5776)";
      buttonText = "Empezar a trabajar";
      headerLine = <HeaderLine>{time}</HeaderLine>;
      subHeaderLine = <SubHeaderLine>{date}</SubHeaderLine>;
      iconbackground = "linear-gradient(247deg, #8a4d92, #ff1842)";
      icon = <IconClock />;
      break;
    case USER_STATUS.paused:
      background = "linear-gradient(247deg, #fe5000, #f6a001)";
      buttonbakground = "linear-gradient(256deg, #fea77f, #facf7f)";
      buttonText = "Volver al trabajo";
      headerLine = <HeaderLine>Descanso iniciado</HeaderLine>;
      subHeaderLine = (
        <SubHeaderLine>a las {datetoHHMM(status.date!)} </SubHeaderLine>
      );
      iconbackground = " linear-gradient(225deg, #fea77f, #facf7f)";
      icon = <IconFork />;
      break;
    case USER_STATUS.finished:
      background = "linear-gradient(230deg, #6d2077 100%, #e4002b)";
      buttonbakground = "linear-gradient(256deg, #b68fbb 100%, #ff5776)";
      buttonText = "Cancelar";
      headerLine = <HeaderLine>Jornada finalizada</HeaderLine>;
      const hoursToday = status.hoursToday!;

      subHeaderLine = (
        <SubHeaderLine>
          A las {datetoHHMM(status.date!)} (Has
          trabajado {decimalToHours(hoursToday)})
        </SubHeaderLine>
      );
      iconbackground = "linear-gradient(225deg, #b68fbb, #ff5776)";
      icon = <IconCoputerOff />;
      break;
  }

  return (
    <Container background={background} status={status.status}>
      <ManualLogsModal
        isOpen={manualModalOpen}
        onClose={closeManualModal}
        onSubmit={submitManualLogs}
        targetDate={manualTargetDate}
        warningMessage={manualWarningMessage}
      />

      <Icon background={iconbackground}>{icon}</Icon>
      {headerLine}
      {subHeaderLine}
      {status.status !== USER_STATUS.finished ? (
        <TimedButton
          width="199px"
          height="50px"
          time={5}
          background={buttonbakground}
          margin={
            status.status === USER_STATUS.not_started
              ? "20px 0 10px 0"
              : "20px 0 40px 0"
          }
          onClick={async () => {
            if (clickable) {
              setClickable(false);
              const hasLogged = await handleLogActivity(action);
              if (hasLogged) {
                refreshStatus();
              }
              setClickable(true);
            }
          }}
        >
          {buttonText}
        </TimedButton>
      ) : (
        <TimedButton
          width="199px"
          height="50px"
          time={5}
          background={buttonbakground}
          margin="20px 0 40px 0"
          onClick={async () => {
            if (clickable) {
              setClickable(false);
              const hasLogged = await handleLogActivity(LOG_TYPE.goback);
              if (hasLogged) {
                refreshStatus();
              }
              setClickable(true);
            }
          }}
        >
          {"I'm back!"}
        </TimedButton>
      )}

      {status.status === USER_STATUS.not_started && (
        <ManualButton onClick={openDefaultManualModal}>Fichaje manual</ManualButton>
      )}

      {status.status !== USER_STATUS.not_started && (
        <>
          <UndoButton onClick={removeLastLog} disabled={undoState === "loading"}>
            {undoState === "loading" ? "Deshaciendo..." : "Deshacer ultimo fichaje de hoy"}
          </UndoButton>
          <UndoFeedback $state={undoState} $isError={undoState === "error"}>
            {undoMessage}
          </UndoFeedback>
        </>
      )}
    </Container>
  );
};

const Container = styled.div<{ background: string; status: USER_STATUS }>`
  width: 615px;
  margin-top: ${(props) =>
    props.status === USER_STATUS.paused ? "1px" : "0px"};
  border-radius: 5px;
  border-top-right-radius: ${(props) =>
    props.status === USER_STATUS.paused ? "0px" : "5px"};
  border-top-left-radius: ${(props) =>
    props.status === USER_STATUS.paused ? "0px" : "5px"};
  background-image: ${(props) => props.background};
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #fff;
`;

const Icon = styled.div<{ background: string }>`
  width: 46px;
  height: 46px;
  margin-top: 40px;
  border-radius: 50%;
  background-image: ${(props) => props.background};
  position: relative;
  svg {
    display: block;
    width: 16px;
    height: 16px;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
`;

const HeaderLine = styled.div`
  height: 25px;
  margin-top: 9px;
  font-size: 20px;
  font-weight: bold;
  line-height: 1.25;
  text-align: center;
  color: #fff;
`;

const SubHeaderLine = styled.div`
  height: 20px;
  margin-top: 5px;
  font-size: 14px;
  line-height: 1.43;
  color: #fff;
  text-transform: titlecase;
`;

const UndoButton = styled.button`
  margin: -20px 0 0 0;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: transparent;
  color: #fff;
  font-size: 13px;
  font-weight: bold;
  border-radius: 4px;
  height: 36px;
  padding: 0 12px;
  cursor: pointer;
  transition: background 0.2s ease, opacity 0.2s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  &:disabled {
    opacity: 0.7;
    cursor: wait;
  }
`;

const ManualButton = styled.button`
  width: 199px;
  height: 40px;
  margin: 0 0 24px 0;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.22);
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.35);
  }
`;

const UndoFeedback = styled.div<{ $state: UndoFeedbackState; $isError: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${(props) => (props.$isError ? "#ffd4d4" : "#c6f7d0")};
  margin-top: ${(props) => (props.$state === "idle" ? "0" : "8px")};
  margin-bottom: 26px;
  max-height: ${(props) => (props.$state === "idle" ? "0" : "24px")};
  opacity: ${(props) => (props.$state === "idle" ? 0 : 1)};
  transform: translateY(${(props) => (props.$state === "idle" ? "-4px" : "0")});
  transition:
    margin-top 0.2s ease,
    max-height 0.2s ease,
    opacity 0.2s ease,
    transform 0.2s ease;
  overflow: hidden;
`;

export default SingleBoxAction;
