import { decimalToHours } from "@/lib/utils";
import { UserToday as UserTodayStats } from "@/types";
import styled from "@emotion/styled";
import React, { useEffect, useState } from "react";
import IconClock from "@/assets/icons/icon-clock.svg";
import TodayLogsModal from "./TodayLogsModal";

const UserToday: React.FC<{ onLogsUpdated?: () => Promise<void> | void }> = ({
  onLogsUpdated,
}) => {
  const fetchUserToday = async () => {
    const response = await fetch(`/api/userToday`);
    const data = await response.json();
    setStats(data);
  };

  const [stats, setStats] = useState<UserTodayStats | undefined>(undefined);
  const [todayModalOpen, setTodayModalOpen] = useState(false);

  useEffect(() => {
    fetchUserToday();
  }, []);

  // refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUserToday();
    }, 3 * 60 * 1000); // every 3 minutes
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <Container>
        <Line>...</Line>
      </Container>
    );
  }

  return (
    <>
      <TodayLogsModal
        isOpen={todayModalOpen}
        onClose={() => setTodayModalOpen(false)}
        onUpdated={async () => {
          await fetchUserToday();
          await onLogsUpdated?.();
        }}
      />
      <Container>
        <Line>
          <IconClock />
          Tiempo trabajado
        </Line>
        <Time>{decimalToHours(stats.hoursToday)}</Time>
        <EditButton onClick={() => setTodayModalOpen(true)}>
          Editar fichajes de hoy
        </EditButton>
      </Container>
    </>
  );
};

const Container = styled.div`
  width: 614px;
  max-width: 100%;
  min-height: 54px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  gap: 10px;
  flex-wrap: wrap;
  box-sizing: border-box;
  padding: 8px 12px;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  background-color: #eaeae9;
  font-size: 14px;
  line-height: 1.43;
`;

const Line = styled.div`
  color: #4e4f53;
  svg {
    width: 11px;
    height: 11px;
    color: #434242;
    margin-right: 5px;
  }
`;

const Time = styled.div`
  font-weight: bold;
  color: #434242;
`;

const EditButton = styled.button`
  margin-left: 10px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid #434242;
  border-radius: 4px;
  background: transparent;
  color: #434242;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: #dfdfde;
  }
`;

export default UserToday;
