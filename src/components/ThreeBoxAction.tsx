import { LOG_TYPE } from "@/types";
import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";
import IconFork from "@/assets/icons/icon-fork-and-spoon.svg";
import IconCoputerOff from "@/assets/icons/icon-computer-off.svg";
import IconConfussion from "@/assets/icons/icon-confussion.svg";
import { useRouter } from "next/router";
import TimedButton from "../ui/TimedButton";
import getMobileDetect from "@/lib/getmobileDetect";
import ManualLogsModal, { ManualLogsData } from "./ManualLogsModal";

const ThreeBoxAction: FC<{
  refreshStatus: () => void;
}> = ({ refreshStatus }) => {
  const router = useRouter();
  const [manualModalOpen, setManualModalOpen] = useState(false);

  const logActivity = async (type: LOG_TYPE) => {
    const device = getMobileDetect();
    const res = await fetch("/api/logActivity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, isMobile: device.isMobile }),
    });
    if (res.status !== 200) router.push("/login");
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
    setManualModalOpen(false);
    refreshStatus();
  };

  const boxes = [
    {
      background: "linear-gradient(220deg, #fe5000, #f6a001)",
      buttonbakground: "linear-gradient(256deg, #fea77f, #facf7f)",
      buttonText: "Pausar",
      headerLine: <HeaderLine>Hacer una pausa</HeaderLine>,
      subHeaderLine: <SubHeaderLine>¿necesitas un descanso?</SubHeaderLine>,
      iconbackground: "linear-gradient(225deg, #fea77f, #facf7f)",
      icon: <IconFork />,
      action: LOG_TYPE.pause,
      openModal: false,
    },
    {
      background: "linear-gradient(220deg, #6d2077, #e4002b)",
      buttonbakground: "linear-gradient(256deg, #b68fbb, #ff5776)",
      buttonText: "Salir",
      headerLine: <HeaderLine>Terminar de trabajar</HeaderLine>,
      subHeaderLine: <SubHeaderLine>Lo he dado todo</SubHeaderLine>,
      iconbackground: "linear-gradient(256deg, #b68fbb, #ff5776)",
      icon: <IconCoputerOff />,
      action: LOG_TYPE.out,
      openModal: false,
    },
    {
      background: "linear-gradient(220deg, #434242, #434242)",
      buttonbakground: "linear-gradient(256deg, #6d6c6c, #6d6c6c)",
      buttonText: "Corregir fichaje",
      headerLine: <HeaderLine>Hoy la he liado</HeaderLine>,
      subHeaderLine: <SubHeaderLine>Introduce las horas</SubHeaderLine>,
      iconbackground: "linear-gradient(247deg, #6d6c6c, #6d6c6c)",
      icon: <IconConfussion />,
      action: LOG_TYPE.in, // unused when openModal is true
      openModal: true,
    },
  ];

  return (
    <>
      <ManualLogsModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onSubmit={submitManualLogs}
      />
      <Container>
        {boxes.map((box, index) => (
          <Box key={index} background={box.background}>
            <Icon background={box.iconbackground}>{box.icon}</Icon>
            {box.headerLine}
            {box.subHeaderLine}
            <TimedButton
              width="155px"
              height="40px"
              time={5}
              background={box.buttonbakground}
              margin="15px 0 20px 0"
              onClick={async () => {
                if (box.openModal) {
                  setManualModalOpen(true);
                } else {
                  await logActivity(box.action);
                  refreshStatus();
                }
              }}
              fontSize="14px"
            >
              {box.buttonText}
            </TimedButton>
          </Box>
        ))}
      </Container>
    </>
  );
};

const Container = styled.div`
  width: 590px;
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  gap: 3px;
  margin-top: 1px;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  background-color: #eaeae9;
  padding: 10px 12px 10px 12px;
`;

const Box = styled.div<{ background: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
  width: 195px;
  //height: 235px;
  border-radius: 3px;
  background-image: ${(props) => props.background};
  padding-bottom: 5px;
`;

const Icon = styled.div<{ background: string }>`
  width: 45px;
  height: 45px;
  max-width: 45px;
  max-height: 45px;
  min-width: 45px;
  min-height: 45px;
  margin-top: 30px;
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
    color: #fff;
  }
`;

const HeaderLine = styled.div`
  width: 74px;
  //height: 40px;
  margin-top: 13px;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.25;
  text-align: center;
  color: #fff;
`;

const SubHeaderLine = styled.div`
  //height: 20px;
  margin-top: 5px;
  font-size: 14px;
  line-height: 1.43;
  color: #fff;
  text-transform: titlecase;
`;

export default ThreeBoxAction;
