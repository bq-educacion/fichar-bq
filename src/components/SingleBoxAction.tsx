import { LOG_TYPE, UserStatus, USER_STATUS } from "@/types";
import styled from "@emotion/styled";
import React, { FC, use, useEffect, useState } from "react";
import IconClock from "@/assets/icons/icon-clock.svg";
import IconFork from "@/assets/icons/icon-fork-and-spoon.svg";
import IconCoputerOff from "@/assets/icons/icon-computer-off.svg";
import IconConfussion from "@/assets/icons/icon-confussion.svg";
import IconBrainup from "@/assets/icons/icon-brainup.svg";

import { useRouter } from "next/router";
import TimedButton from "../ui/TimedButton";
import { datetoHHMM } from "@/lib/utils";
import getMobileDetect from "@/lib/getmobileDetect";

import Modal from "react-modal";
import { set } from "mongoose";
import { frasesBrainUp } from "@/usebrainup";

const SingleBoxAction: FC<{
  action: LOG_TYPE;
  status: UserStatus;
  refreshStatus: () => void;
}> = ({ action, status, refreshStatus }) => {
  const router = useRouter();
  const [clickable, setClickable] = useState<boolean>(true);
  const [openModal, setOpenModal] = useState(false);
  useEffect(() => {
    setClickable(true);
  }, [status]);

  const [time, setTime] = useState<string>(
    `${new Date().getHours()}:${
      new Date().getMinutes() < 10
        ? "0" + new Date().getMinutes()
        : new Date().getMinutes()
    }`,
  );
  const [date, setDate] = useState<string>(
    new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  );

  const logActivity = async (type: LOG_TYPE) => {
    // check if mobile device
    const device = getMobileDetect();
    const res = await fetch("/api/logActivity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, isMobile: device.isMobile }),
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
        }),
      );
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status.status === USER_STATUS.not_started) {
      setOpenModal(true);
    }
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
          A las {status.date?.getHours()}:{status.date?.getMinutes()} (Has
          trabajado {Math.floor(hoursToday)}h{Math.floor((hoursToday % 1) * 60)}
          m)
        </SubHeaderLine>
      );
      iconbackground = "linear-gradient(225deg, #b68fbb, #ff5776)";
      icon = <IconCoputerOff />;
      break;
    case USER_STATUS.error:
      background = "linear-gradient(230deg, #434242, #434242)";
      buttonbakground = "linear-gradient(256deg, #6d6c6c, #6d6c6c)";
      buttonText = "Cancelar";
      headerLine = <HeaderLine>Hoy la he liado</HeaderLine>;

      subHeaderLine = (
        <SubHeaderLine>A las {datetoHHMM(status.date!)}</SubHeaderLine>
      );
      iconbackground = "linear-gradient(225deg, #6d6c6c, #6d6c6c)";
      icon = <IconConfussion />;
  }

  return (
    <Container background={background} status={status.status}>
      <Modal
        isOpen={openModal}
        style={modalStyles}
        contentLabel="Kindly reminder matutino"
      >
        <ModalContent>
          <Icon
            background="linear-gradient(225deg, #b68fbb, #ff5776)"
            style={{ margin: "0 0 20px 0" }}
          >
            <IconBrainup />
          </Icon>
          <p>
            {frasesBrainUp[Math.floor(Math.random() * frasesBrainUp.length)]}
          </p>
          <ModalButton
            onClick={() => {
              setOpenModal(false);
              window.open("https://brainup-main.cluster.bq.com/", "_blank");
            }}
          >
            ¡Vamos!
          </ModalButton>
        </ModalContent>
      </Modal>

      <Icon background={iconbackground}>{icon}</Icon>
      {headerLine}
      {subHeaderLine}
      {![USER_STATUS.error, USER_STATUS.finished].includes(status.status) ? (
        <TimedButton
          width="199px"
          height="50px"
          time={5}
          background={buttonbakground}
          margin="20px 0 40px 0"
          onClick={async () => {
            if (clickable) {
              setClickable(false);
              await logActivity(action);
              refreshStatus();
            }
          }}
        >
          {buttonText}
        </TimedButton>
      ) : (
        <>
          {USER_STATUS.finished === status.status ? (
            <TimedButton
              width="199px"
              height="50px"
              time={5}
              background={buttonbakground}
              margin="20px 0 40px 0"
              onClick={async () => {
                if (clickable) {
                  setClickable(false);
                  await logActivity(LOG_TYPE.goback);
                  refreshStatus();
                }
              }}
            >
              {"I'm back!"}
            </TimedButton>
          ) : (
            <>
              <br />
              <br />
            </>
          )}
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

const modalStyles = {
  content: {
    top: "50%",
    left: "50%",
    height: "250px",
    width: "320px",
    transform: "translate(-50%, -50%)",
    backgroundImage: "linear-gradient(230deg, #6d2077 100%, #e4002b)",
    color: "#fff",
    border: "none",
    overflow: "hidden",
  },
};

const ModalContent = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 20px;

  p {
    text-align: center;
    margin: 0 0 30px 0;
    line-height: 1.5;
  }
`;

const ModalButton = styled.div`
  width: auto;
  cursor: pointer;
  background-image: linear-gradient(256deg, #b68fbb 100%, #ff5776);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  color: white;
  font-size: 16px;
  font-weight: bold;
  height: 50px;
  width: 100px;
`;

export default SingleBoxAction;
