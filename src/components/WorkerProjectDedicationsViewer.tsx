import type { WorkerProjectDedicationSummary } from "@/controllers/getWorkerProjectDedicationSummary";
import DisplayContent from "@/ui/DisplayContent";
import styled from "@emotion/styled";
import React, { FC } from "react";

const formatPercentage = (value: number) => `${value.toFixed(1).replace(/\.0$/, "")}%`;

const WorkerProjectDedicationsViewer: FC<{
  summary: WorkerProjectDedicationSummary;
}> = ({ summary }) => {
  return (
    <DisplayContent opened={true} title="Dedicación por proyecto" bold={true}>
      <Container>
        {summary.rows.length === 0 ? (
          <EmptyText>No hay dedicaciones registradas en estos periodos.</EmptyText>
        ) : (
          <Table rows={summary.rows.length}>
            <Header>Proyecto</Header>
            <Header>Esta semana ({summary.thisWeekDaysElapsed} días con dedicación)</Header>
            <Header>Semana pasada ({summary.previousWeekDays} días con dedicación)</Header>
            <Header>Este mes ({summary.thisMonthDaysElapsed} días con dedicación)</Header>

            {summary.rows.map((row) => (
              <React.Fragment key={row.projectId}>
                <ProjectName>{row.projectName}</ProjectName>
                <Data>{formatPercentage(row.thisWeek)}</Data>
                <Data>{formatPercentage(row.previousWeek)}</Data>
                <Data>{formatPercentage(row.thisMonth)}</Data>
              </React.Fragment>
            ))}
          </Table>
        )}
      </Container>
    </DisplayContent>
  );
};

const Container = styled.div`
  border-top: 2px solid #fff;
  width: 100%;
  overflow: auto;
`;

const Table = styled.div<{ rows: number }>`
  width: 100%;
  min-width: 614px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  grid-template-rows: 38px ${(props) => `repeat(${props.rows}, 38px)`};
  column-gap: 2px;
  row-gap: 2px;
  background-color: #fff;
`;

const Header = styled.div`
  font-size: 14px;
  font-weight: bold;
  color: #4e4f53;
  padding: 0 20px;
  background-color: #eee;
  display: flex;
  justify-content: left;
  align-items: center;
`;

const ProjectName = styled.div`
  font-size: 14px;
  color: #4e4f53;
  padding: 0 20px;
  background-color: #eee;
  display: flex;
  justify-content: left;
  align-items: center;
  text-transform: capitalize;
`;

const Data = styled.div`
  font-size: 14px;
  color: #4e4f53;
  padding: 0 20px;
  background-color: #eee;
  display: flex;
  justify-content: left;
  align-items: center;
`;

const EmptyText = styled.div`
  background-color: #eee;
  color: #4e4f53;
  font-size: 14px;
  padding: 14px 20px;
`;

export default WorkerProjectDedicationsViewer;
