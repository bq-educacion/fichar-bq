import { UserStats } from "@/types";
import DisplayContent from "@/ui/DisplayContent";
import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";

const UserStats = () => {
  const [stats, setStats] = useState<UserStats | undefined>(undefined);
  useEffect(() => {
    const fetchUserStats = async () => {
      const response = await fetch(`/api/userStats`);
      const data = await response.json();
      setStats(data);
    };
    fetchUserStats();
  }, []);
  if (!stats) {
    return <div>Loading...</div>;
  }

  return (
    <DisplayContent title="Tiempo trabajado">
      <Container>
        <Table>
          <Header />
          <Header>Horas/día </Header>
          <Header>Días</Header>
          <Header>Días mal fichados</Header>
          <Title>Esta semana</Title>
          <Data>{stats.averageThisWeek.toFixed(2).replace(/\.?0+$/, "")}</Data>
          <Data>{stats.logsThisWeekDays.toFixed(2).replace(/\.?0+$/, "")}</Data>
          <Data>
            {stats.errorLogsThisWeek.toFixed(2).replace(/\.?0+$/, "")}{" "}
          </Data>
          <Title>Este mes</Title>
          <Data>{stats.averageThisMonth.toFixed(2).replace(/\.?0+$/, "")}</Data>
          <Data>
            {stats.logsThisMonthDays.toFixed(2).replace(/\.?0+$/, "")}{" "}
          </Data>
          <Data>
            {stats.errorLogsThisMonth.toFixed(2).replace(/\.?0+$/, "")}
          </Data>
          <Title>Este año</Title>
          <Data>{stats.averageThisYear.toFixed(2).replace(/\.?0+$/, "")}</Data>
          <Data>{stats.logsThisYearDays.toFixed(2).replace(/\.?0+$/, "")}</Data>
          <Data>
            {stats.errorLogsThisYear.toFixed(2).replace(/\.?0+$/, "")}
          </Data>
        </Table>
      </Container>
    </DisplayContent>
  );
};

const Container = styled.div`
  border-top: 2px solid #fff;
  width: 100%;
  overflow: hidden;
`;

const Table = styled.div`
  width: 614px;
  display: grid;
  grid-template-columns: 179px 1fr 1fr auto;
  grid-template-rows: repeat(4, 38px);
  column-gap: 2px;
  row-gap: 2px;
  background-color: #fff;
`;

const Data = styled.div`
  font-size: 14px;
  font-weight: normal;
  color: #4e4f53;
  padding: 0 20px 0 20px;
  width: calc(100%-40px);
  background-color: #eee;
  height: 100%;
  display: flex;
  justify-content: left;
  align-items: center;
`;
const Title = styled.div`
  font-size: 14px;
  font-weight: normal;
  color: #4e4f53;
  padding-left: 30px;
  width: calc(100%-30px);
  background-color: #eee;
  height: 100%;
  display: flex;
  justify-content: left;
  align-items: center;
`;

const Header = styled.div`
  font-size: 14px;
  font-weight: bold;
  color: #4e4f53;
  padding: 0 20px 0 20px;
  width: calc(100%-40px);
  background-color: #eee;
  height: 100%;
  display: flex;
  justify-content: left;
  align-items: center;
`;

export default UserStats;
