import { ProjectCostAllocationRowResponse } from "@/schemas/projectCosts";
import styled from "@emotion/styled";
import React, { FC } from "react";

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentageFormatter = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const AdminProjectCostAllocationTable: FC<{
  rows: ProjectCostAllocationRowResponse[];
}> = ({ rows }) => {
  if (rows.length === 0) {
    return <EmptyState>No hay proyectos con base de reparto para este mes.</EmptyState>;
  }

  return (
    <TableScroll>
      <Table>
        <thead>
          <tr>
            <HeaderCell>Proyecto</HeaderCell>
            <HeaderCell>Coste personal</HeaderCell>
            <HeaderCell>Peso</HeaderCell>
            <HeaderCell>Gasto general asignado</HeaderCell>
            <HeaderCell>Coste final</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.projectId}>
              <DataCell>{row.projectName}</DataCell>
              <DataCell>{currencyFormatter.format(row.personnelCost)}</DataCell>
              <DataCell>{percentageFormatter.format(row.weight)}</DataCell>
              <DataCell>{currencyFormatter.format(row.allocatedGeneralCost)}</DataCell>
              <DataCell>{currencyFormatter.format(row.finalCost)}</DataCell>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableScroll>
  );
};

const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  background: #fff;
`;

const Table = styled.table`
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  color: #4e4f53;

  th,
  td {
    border-bottom: 1px solid #ececec;
    text-align: left;
  }
`;

const HeaderCell = styled.th`
  background: #f4f4f4;
  padding: 12px;
  font-size: 12px;
  text-transform: uppercase;
`;

const DataCell = styled.td`
  padding: 12px;
  font-size: 13px;
`;

const EmptyState = styled.div`
  padding: 18px;
  border-radius: 8px;
  border: 1px dashed #d8d8d8;
  color: #6d6e72;
  background: #fafafa;
  font-size: 14px;
`;

export default AdminProjectCostAllocationTable;
