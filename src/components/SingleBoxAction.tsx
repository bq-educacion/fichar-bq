import { LOG_TYPE } from "@/types";
import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";
import IconClock from "@/assets/icons/icon-clock.svg";

const SingleBoxAction: FC<{ action: LOG_TYPE }> = ({ action }) => {
  const [time, setTime] = useState<string>(
    new Date().getHours() + ":" + new Date().getMinutes()
  );
  const [date, setDate] = useState<string>(
    new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

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
  switch (action) {
    case LOG_TYPE.in:
      background = "linear-gradient(247deg, #8a4d92, #ff1842)";
      break;
    case LOG_TYPE.out:
      background = "#fff";
      break;
    case LOG_TYPE.error:
      background = "#fff";
      break;
  }

  return (
    <Container background={background}>
      <Icon>
        <IconClock />
      </Icon>
      <Time>{time}</Time>
      <DateLine>{date}</DateLine>
    </Container>
  );
};

const Container = styled.div<{ background: string }>`
  width: 615px;
  height: 255px;
  margin: 10px 0;
  padding: 40px 208px;
  border-radius: 5px;
  background-image: ${(props) => props.background};
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #fff;
`;

const Icon = styled.div`
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background-image: linear-gradient(225deg, #b68fbb, #ff5776);
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

const Time = styled.div`
  height: 25px;
  margin-top: 9px;
  font-size: 20px;
  font-weight: bold;
  line-height: 1.25;
  text-align: center;
  color: #fff;
`;

const DateLine = styled.div`
  height: 20px;
  margin-top: 5px;
  font-size: 14px;
  line-height: 1.43;
  color: #fff;
  text-transform: capitalize;
`;

export default SingleBoxAction;
