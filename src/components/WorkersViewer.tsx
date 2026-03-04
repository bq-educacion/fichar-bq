import { datetoHHMM, decimalToHours } from "@/lib/utils";
import { LogsStats, User } from "@/types";
import SimpleContainer from "@/ui/SimpleContainer";
import styled from "@emotion/styled";
import Link from "next/link";
import React, { FC } from "react";

const WorkersViewer: FC<{ workers: Array<User & { stats: LogsStats }> }> = ({
  workers,
}) => {
  return (
    <SimpleContainer
      title="Mi Equipo"
      textColor="#4e4f53"
      fontSize="14px"
      height="40px"
      backgroundImage="linear-gradient(220deg, #eee, #eee)"
    >
      <Container>
        <Table rows={workers.length}>
          <Header>Nombre</Header>
          <Header>
            Horas/día
            <br /> (30 días)
          </Header>
          <Header>Correctos</Header>
          <Header>Manuales</Header>
          {workers.map((worker) => (
            <Row href={`/worker/${worker.id}`} key={worker.id}>
              <Data>{worker.name.toLowerCase()}</Data>
              <Data>{decimalToHours(worker.stats.average)}</Data>
              <Data>{worker.stats.logsDays}</Data>
              <Data>{worker.stats.manualLogsDays}</Data>
            </Row>
          ))}
        </Table>
      </Container>
    </SimpleContainer>
  );
};

const Container = styled.div`
  border-top: 2px solid #fff;
  width: 100%;
  overflow: hidden;
`;

const Table = styled.div<{ rows: number }>`
  width: 614px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  grid-template-rows: 58px ${(props) => `repeat(${props.rows}, 40px)`};
  column-gap: 1px;
  row-gap: 1px;
  background-color: #fff;
`;

const Row = styled(Link)`
  display: contents;
  :hover > * {
    background-color: #a1dbd7;
    overflow: visible;
  }
`;

const Data = styled.span`
  text-transform: capitalize;
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
  a {
    color: #4e4f53;
    text-decoration: none;
    font-weight: normal;
  }
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

export default WorkersViewer;
