import { UserToday } from "@/types";
import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";

const UserToday: FC<{ email: string }> = ({ email }) => {
  const fetchUserToday = async () => {
    const response = await fetch(`/api/userToday`);
    const data = await response.json();
    setStats(data);
  };

  const [stats, setStats] = useState<UserToday | undefined>(undefined);
  useEffect(() => {
    fetchUserToday();
  }, [email]);

  // refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUserToday();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [email]);

  if (!stats) {
    return <div>Loading...</div>;
  }

  return (
    <Container>
      <div>Tiempo trabajado</div>
      <Time>
        {Math.floor(stats.hoursToday)}h{Math.floor((stats.hoursToday % 1) * 60)}
        m
      </Time>
    </Container>
  );
};

const Container = styled.div`
  width: 615px;
  height: 54px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  gap: 10px;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  background-color: #eaeae9;
  font-size: 14px;
  line-height: 1.43;
`;

const Line = styled.div`
  letter-spacing: normal;
  text-align: center;
  color: #4e4f53;
`;

const Time = styled.div`
  font-weight: bold;
  color: #434242;
`;

export default UserToday;
