import type { ProjectCostDetailItemResponse } from "@/schemas/projectCosts";
import styled from "@emotion/styled";
import type { FC } from "react";

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentageFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatPercentage = (value: number | null): string =>
  value === null ? "No aplica" : `${percentageFormatter.format(value)}%`;

const AdminProjectCostDetailPanel: FC<{
  open: boolean;
  title: string;
  value: number;
  mode: "base" | "final";
  details: ProjectCostDetailItemResponse[];
  warnings: string[];
  allocatedGeneralCost: number;
  onClose: () => void;
}> = ({ open, title, value, mode, details, warnings, allocatedGeneralCost, onClose }) => {
  if (!open) {
    return null;
  }

  return (
    <Overlay onClick={onClose}>
      <Panel onClick={(event) => event.stopPropagation()}>
        <Header>
          <div>
            <Title>{title}</Title>
            <Subtitle>{currencyFormatter.format(value)}</Subtitle>
          </div>
          <CloseButton type="button" onClick={onClose}>
            Cerrar
          </CloseButton>
        </Header>

        {warnings.length > 0 && (
          <WarningBox>
            {warnings.map((warning) => (
              <WarningItem key={warning}>{warning}</WarningItem>
            ))}
          </WarningBox>
        )}

        {mode === "final" && allocatedGeneralCost > 0 && (
          <InfoBox>
            Coste general repartido en esta celda: {currencyFormatter.format(allocatedGeneralCost)}
          </InfoBox>
        )}

        {details.length === 0 ? (
          <EmptyState>No hay detalle adicional para esta celda.</EmptyState>
        ) : (
          <DetailsTable>
            <thead>
              <tr>
                <HeaderCell>Persona / origen</HeaderCell>
                <HeaderCell>Departamento</HeaderCell>
                <HeaderCell>Proyecto</HeaderCell>
                <HeaderCell>%</HeaderCell>
                <HeaderCell>Coste asignado</HeaderCell>
                <HeaderCell>Warning</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {details.map((detail, index) => (
                <tr key={`${detail.label}-${detail.projectId ?? "general"}-${index}`}>
                  <DataCell>
                    <StrongText>{detail.label}</StrongText>
                  </DataCell>
                  <DataCell>{detail.departmentName}</DataCell>
                  <DataCell>{detail.projectName ?? "Gastos generales"}</DataCell>
                  <DataCell>{formatPercentage(detail.allocationPercentage)}</DataCell>
                  <DataCell>{currencyFormatter.format(detail.assignedMonthlyCost)}</DataCell>
                  <DataCell>{detail.warning ?? "-"}</DataCell>
                </tr>
              ))}
            </tbody>
          </DetailsTable>
        )}
      </Panel>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1100;
  display: flex;
  justify-content: flex-end;
`;

const Panel = styled.div`
  width: min(720px, 100%);
  height: 100%;
  background: #fff;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`;

const Title = styled.h2`
  margin: 0;
  color: #4e4f53;
  font-size: 20px;
`;

const Subtitle = styled.div`
  margin-top: 6px;
  color: #6d6e72;
  font-size: 14px;
  font-weight: 600;
`;

const CloseButton = styled.button`
  height: 38px;
  border: 1px solid #d1d1d1;
  border-radius: 4px;
  background: #fff;
  color: #4e4f53;
  font-weight: 600;
  padding: 0 14px;
  cursor: pointer;
`;

const WarningBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 6px;
  background: #fff2e8;
  color: #8a3b12;
  border: 1px solid #ffd1b6;
`;

const WarningItem = styled.div`
  font-size: 13px;
  font-weight: 600;
`;

const InfoBox = styled.div`
  padding: 12px;
  border-radius: 6px;
  background: #f3f7ff;
  color: #2f4e85;
  border: 1px solid #d5e3ff;
  font-size: 13px;
  font-weight: 600;
`;

const EmptyState = styled.div`
  padding: 18px;
  border-radius: 6px;
  background: #f7f7f7;
  color: #6d6e72;
  font-size: 14px;
`;

const DetailsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #4e4f53;

  th,
  td {
    border-bottom: 1px solid #ececec;
    vertical-align: top;
  }
`;

const HeaderCell = styled.th`
  padding: 10px 8px;
  text-align: left;
  background: #f4f4f4;
  font-size: 12px;
  text-transform: uppercase;
  color: #4e4f53;
`;

const DataCell = styled.td`
  padding: 10px 8px;
  text-align: left;
`;

const StrongText = styled.div`
  font-weight: 600;
`;

export default AdminProjectCostDetailPanel;
