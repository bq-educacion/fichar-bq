import { decimalToHours } from "@/lib/utils";
import { UserStats } from "@/types";
import DisplayContent from "@/ui/DisplayContent";
import styled from "@emotion/styled";
import React, { FC } from "react";

const UserStatsViewer: FC<{ stats: UserStats }> = ({ stats }) => {
  return (
    <DisplayContent opened={true} title="Tiempo trabajado" bold={true}>
      <Container>
        <Table>
          <Header />
          <Header>Horas/día</Header>
          <Header>Total</Header>
          <Header>Días</Header>
          <Header>Días manuales</Header>
          <Title>Esta semana</Title>
          <Data>{decimalToHours(stats.averageThisWeek)}</Data>
          <Data>
            {decimalToHours(stats.averageThisWeek * stats.logsThisWeekDays)}
          </Data>
          <Data>{stats.logsThisWeekDays.toFixed(2).replace(/\.?0+$/, "")}</Data>
          <Data>
            {(stats.manualLogsThisWeek ?? 0).toFixed(0)}
          </Data>
          <Title>Este mes</Title>
          <Data>{decimalToHours(stats.averageThisMonth)}&nbsp;</Data>
          <Data>
            {decimalToHours(stats.averageThisMonth * stats.logsThisMonthDays)}
          </Data>
          <Data>
            {stats.logsThisMonthDays.toFixed(2).replace(/\.?0+$/, "")}{" "}
          </Data>
          <Data>
            {(stats.manualLogsThisMonth ?? 0).toFixed(0)}
          </Data>
          <Title>Este año</Title>
          <Data>{decimalToHours(stats.averageThisYear)}&nbsp;</Data>
          <Data>
            {decimalToHours(stats.averageThisYear * stats.logsThisYearDays)}
          </Data>
          <Data>{stats.logsThisYearDays.toFixed(2).replace(/\.?0+$/, "")}</Data>
          <Data>
            {(stats.manualLogsThisYear ?? 0).toFixed(0)}
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
  grid-template-columns: 179px 1fr 1fr auto auto;
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

export default UserStatsViewer;
