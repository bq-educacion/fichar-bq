import styled from "@emotion/styled";
import React, { FC, ReactNode, useEffect, useRef } from "react";

const TimedButton: FC<{
  time?: number;
  onClick: () => void;
  children: ReactNode;
  background: string;
  width: string;
  height: string;
  margin: string;
  fontSize?: string;
}> = ({
  time,
  onClick,
  children,
  background,
  width,
  height,
  margin,
  fontSize,
}) => {
  const [timeLeft, setTimeLeft] = React.useState<number | undefined>(time);
  const [clicked, setClicked] = React.useState(false);
  const interval = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    console.log("clicked", clicked);
    if (clicked) {
      let timeout = time!;

      interval.current = setInterval(() => {
        console.log("timeout", timeout);
        if (timeout === 1) {
          clearInterval(interval.current);
          setClicked(false);
          console.log("Ejecución onClick");
          onClick();
        } else {
          timeout--;
          setTimeLeft(timeout);
        }
      }, 1000);
    }
  }, [clicked]);

  return (
    <Button
      width={width}
      height={height}
      background={background}
      margin={margin}
      onClick={() => {
        if (clicked) {
          setClicked(false);
          setTimeLeft(time);
          clearInterval(interval.current);
        } else if (!time) {
          onClick();
        } else {
          setClicked(true);
          setTimeLeft(time);
        }
      }}
    >
      {clicked && timeLeft ? <>Cancelar ({timeLeft} s) </> : <>{children}</>}
    </Button>
  );
};

const Button = styled.div<{
  background: string;
  width: string;
  height: string;
  margin: string;
  fontSize?: string;
}>`
  background-image: ${({ background }) => background};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: ${({ width }) => width};
  height: ${({ height }) => height};
  margin: ${({ margin }) => margin};
  border-radius: 4px;
  color: white;
  font-size: ${({ fontSize }) => fontSize};
  font-weight: bold;
`;

export default TimedButton;
