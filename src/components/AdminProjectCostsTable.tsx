import {
  ProjectCostProjectCellResponse,
  ProjectCostRowResponse,
  ProjectCostTotalsResponse,
} from "@/schemas/projectCosts";
import styled from "@emotion/styled";
import React, { FC, useMemo } from "react";

export type AdminProjectCostsMode = "base" | "final";

export type AdminProjectCostsSort = {
  key: "department" | "general" | "total" | `project:${string}`;
  direction: "asc" | "desc";
};

export type AdminProjectCostsCellSelection =
  | {
      type: "row-general";
      rowId: string;
    }
  | {
      type: "row-project";
      rowId: string;
      projectId: string;
    }
  | {
      type: "row-total";
      rowId: string;
    }
  | {
      type: "totals-general";
    }
  | {
      type: "totals-project";
      projectId: string;
    }
  | {
      type: "totals-total";
    };

const getDisplayedCellValue = (
  mode: AdminProjectCostsMode,
  cell: Pick<ProjectCostProjectCellResponse, "baseCost" | "finalCost">
): number => (mode === "base" ? cell.baseCost : cell.finalCost);

const getDisplayedGeneralValue = (
  mode: AdminProjectCostsMode,
  cell: ProjectCostRowResponse["generalCosts"] | ProjectCostTotalsResponse["generalCosts"]
): number => (mode === "base" ? cell.baseCost : cell.finalCost);

const getDisplayedTotalValue = (
  mode: AdminProjectCostsMode,
  row: Pick<ProjectCostRowResponse | ProjectCostTotalsResponse, "totalBase" | "totalFinal">
): number => (mode === "base" ? row.totalBase : row.totalFinal);

const compareNumbers = (left: number, right: number): number => left - right;

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const sortRows = (
  rows: ProjectCostRowResponse[],
  sort: AdminProjectCostsSort,
  mode: AdminProjectCostsMode
): ProjectCostRowResponse[] => {
  const sorted = [...rows];

  sorted.sort((left, right) => {
    let value = 0;

    if (sort.key === "department") {
      value = left.departmentName.localeCompare(right.departmentName, "es");
    } else if (sort.key === "general") {
      value = compareNumbers(
        getDisplayedGeneralValue(mode, left.generalCosts),
        getDisplayedGeneralValue(mode, right.generalCosts)
      );
    } else if (sort.key === "total") {
      value = compareNumbers(
        getDisplayedTotalValue(mode, left),
        getDisplayedTotalValue(mode, right)
      );
    } else {
      const projectId = sort.key.replace(/^project:/, "");
      const leftProject = left.projects.find((project) => project.projectId === projectId);
      const rightProject = right.projects.find((project) => project.projectId === projectId);

      value = compareNumbers(
        getDisplayedCellValue(mode, leftProject ?? { baseCost: 0, finalCost: 0 }),
        getDisplayedCellValue(mode, rightProject ?? { baseCost: 0, finalCost: 0 })
      );
    }

    return sort.direction === "asc" ? value : value * -1;
  });

  return sorted;
};

const renderSortIndicator = (sort: AdminProjectCostsSort, key: AdminProjectCostsSort["key"]) =>
  sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : "";

const formatCurrency = (value: number): string => currencyFormatter.format(value);

const AdminProjectCostsTable: FC<{
  mode: AdminProjectCostsMode;
  rows: ProjectCostRowResponse[];
  projects: Array<{ projectId: string; projectName: string }>;
  totals: ProjectCostTotalsResponse;
  sort: AdminProjectCostsSort;
  onSortChange: (sort: AdminProjectCostsSort) => void;
  onSelectCell: (selection: AdminProjectCostsCellSelection) => void;
}> = ({ mode, rows, projects, totals, sort, onSortChange, onSelectCell }) => {
  const sortedRows = useMemo(() => sortRows(rows, sort, mode), [mode, rows, sort]);

  const toggleSort = (key: AdminProjectCostsSort["key"]) => {
    if (sort.key === key) {
      onSortChange({
        key,
        direction: sort.direction === "asc" ? "desc" : "asc",
      });
      return;
    }

    onSortChange({
      key,
      direction: key === "department" ? "asc" : "desc",
    });
  };

  return (
    <TableScroll>
      <StyledTable>
        <thead>
          <tr>
            <StickyLeftHeader>
              <SortButton type="button" onClick={() => toggleSort("department")}>
                Departamento{renderSortIndicator(sort, "department")}
              </SortButton>
            </StickyLeftHeader>
            <HeaderCell>
              <SortButton type="button" onClick={() => toggleSort("general")}>
                Gastos generales{renderSortIndicator(sort, "general")}
              </SortButton>
            </HeaderCell>
            {projects.map((project) => (
              <HeaderCell key={project.projectId}>
                <SortButton
                  type="button"
                  onClick={() => toggleSort(`project:${project.projectId}`)}
                >
                  {project.projectName}
                  {renderSortIndicator(sort, `project:${project.projectId}`)}
                </SortButton>
              </HeaderCell>
            ))}
            <StickyRightHeader>
              <SortButton type="button" onClick={() => toggleSort("total")}>
                Total{renderSortIndicator(sort, "total")}
              </SortButton>
            </StickyRightHeader>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.departmentId}>
              <StickyLeftCell>{row.departmentName}</StickyLeftCell>
              <ValueCell>
                <ValueButton
                  type="button"
                  onClick={() => onSelectCell({ type: "row-general", rowId: row.departmentId })}
                >
                  {formatCurrency(getDisplayedGeneralValue(mode, row.generalCosts))}
                </ValueButton>
              </ValueCell>
              {projects.map((project) => {
                const cell =
                  row.projects.find((item) => item.projectId === project.projectId) ?? null;

                return (
                  <ValueCell key={project.projectId}>
                    <ValueButton
                      type="button"
                      onClick={() =>
                        onSelectCell({
                          type: "row-project",
                          rowId: row.departmentId,
                          projectId: project.projectId,
                        })
                      }
                    >
                      {formatCurrency(
                        getDisplayedCellValue(
                          mode,
                          cell ?? { baseCost: 0, finalCost: 0 }
                        )
                      )}
                    </ValueButton>
                  </ValueCell>
                );
              })}
              <StickyRightCell>
                <ValueButton
                  type="button"
                  onClick={() => onSelectCell({ type: "row-total", rowId: row.departmentId })}
                >
                  {formatCurrency(getDisplayedTotalValue(mode, row))}
                </ValueButton>
              </StickyRightCell>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <StickyLeftFooter>Total</StickyLeftFooter>
            <FooterCell>
              <ValueButton type="button" onClick={() => onSelectCell({ type: "totals-general" })}>
                {formatCurrency(getDisplayedGeneralValue(mode, totals.generalCosts))}
              </ValueButton>
            </FooterCell>
            {projects.map((project) => {
              const totalProject =
                totals.projects.find((item) => item.projectId === project.projectId) ?? null;

              return (
                <FooterCell key={project.projectId}>
                  <ValueButton
                    type="button"
                    onClick={() =>
                      onSelectCell({
                        type: "totals-project",
                        projectId: project.projectId,
                      })
                    }
                  >
                    {formatCurrency(
                      getDisplayedCellValue(
                        mode,
                        totalProject ?? { baseCost: 0, finalCost: 0 }
                      )
                    )}
                  </ValueButton>
                </FooterCell>
              );
            })}
            <StickyRightFooter>
              <ValueButton type="button" onClick={() => onSelectCell({ type: "totals-total" })}>
                {formatCurrency(getDisplayedTotalValue(mode, totals))}
              </ValueButton>
            </StickyRightFooter>
          </tr>
        </tfoot>
      </StyledTable>
    </TableScroll>
  );
};

const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
  background: #fff;
  border: 1px solid #d8d8d8;
`;

const StyledTable = styled.table`
  width: 100%;
  min-width: 960px;
  border-collapse: separate;
  border-spacing: 0;
  color: #4e4f53;

  th,
  td {
    border-bottom: 1px solid #e5e5e5;
    border-right: 1px solid #ededed;
    background: #fff;
  }

  tbody tr:hover td {
    background: #fbfbfb;
  }

  tfoot td,
  tfoot th {
    background: #f4f4f4;
    font-weight: 700;
  }
`;

const BaseHeaderCell = styled.th`
  position: sticky;
  top: 0;
  z-index: 3;
  background: #f0f0f0;
  text-align: left;
  padding: 0;
  white-space: nowrap;
`;

const HeaderCell = styled(BaseHeaderCell)``;

const StickyLeftHeader = styled(BaseHeaderCell)`
  left: 0;
  z-index: 5;
`;

const StickyRightHeader = styled(BaseHeaderCell)`
  right: 0;
  z-index: 5;
`;

const SortButton = styled.button`
  width: 100%;
  min-height: 46px;
  border: none;
  background: transparent;
  text-align: left;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: #4e4f53;
  cursor: pointer;
`;

const BaseCell = styled.td`
  min-width: 160px;
  padding: 0;
  vertical-align: middle;
`;

const ValueCell = styled(BaseCell)``;

const StickyLeftCell = styled.th`
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
  min-width: 220px;
  padding: 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
`;

const StickyRightCell = styled(BaseCell)`
  position: sticky;
  right: 0;
  z-index: 2;
  background: #fff;
`;

const FooterCell = styled.td`
  padding: 0;
  background: #f4f4f4;
`;

const StickyLeftFooter = styled.th`
  position: sticky;
  left: 0;
  z-index: 4;
  background: #f4f4f4;
  min-width: 220px;
  padding: 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
`;

const StickyRightFooter = styled.td`
  position: sticky;
  right: 0;
  z-index: 4;
  background: #f4f4f4;
`;

const ValueButton = styled.button`
  width: 100%;
  min-height: 48px;
  border: none;
  background: transparent;
  padding: 12px;
  text-align: right;
  font-size: 13px;
  color: #4e4f53;
  cursor: pointer;

  &:hover {
    background: rgba(138, 77, 146, 0.06);
  }
`;

export default AdminProjectCostsTable;
