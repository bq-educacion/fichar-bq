import { LOG_TYPE, Status, USER_STATUS } from "@/types";
import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";
import IconClock from "@/assets/icons/icon-clock.svg";
import IconFork from "@/assets/icons/icon-fork-and-spoon.svg";
import IconCoputerOff from "@/assets/icons/icon-computer-off.svg";
import { useRouter } from "next/router";
import TimedButton from "../ui/TimedButton";

const SingleBoxAction: FC<{
  action: LOG_TYPE;
  status: Status;
  refreshStatus: () => void;
}> = ({ action, status, refreshStatus }) => {
  const router = useRouter();
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
    const res = await fetch("/api/logActivity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type }),
    });
    //const data = await res.json();
    if (res.status !== 200) router.push("/login");
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
        <SubHeaderLine>
          a las {status.date?.getHours()}:{status.date?.getMinutes()}{" "}
        </SubHeaderLine>
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
      console.log("hoursToday:", hoursToday);

      subHeaderLine = (
        <SubHeaderLine>
          A las {status.date?.getHours()}:{status.date?.getMinutes()} (Has
          trabajado {Math.floor(hoursToday)}h ,{" "}
          {Math.floor((hoursToday % 1) * 60)}m)
        </SubHeaderLine>
      );
      iconbackground = "linear-gradient(225deg, #b68fbb, #ff5776)";
      icon = <IconCoputerOff />;
  }

  return (
    <Container background={background}>
      <Icon background={iconbackground}>{icon}</Icon>
      {headerLine}
      {subHeaderLine}
      <TimedButton
        time={5}
        background={buttonbakground}
        onClick={async () => {
          await logActivity(action);
          refreshStatus();
        }}
      >
        {buttonText}
      </TimedButton>
    </Container>
  );
};

const Container = styled.div<{ background: string }>`
  width: 615px;
  margin-top: 0px;
  border-radius: 5px;
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

export default SingleBoxAction;
