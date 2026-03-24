import type {
  ProjectCostRowResponse,
  ProjectCostTotalsResponse,
} from "@/schemas/projectCosts";
import styled from "@emotion/styled";
import { type FC, useMemo } from "react";

export type AdminProjectCostsSort = {
  key: "department" | "total" | `project:${string}`;
  direction: "asc" | "desc";
};

export type AdminProjectCostsCellSelection =
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
      type: "totals-project";
      projectId: string;
    }
  | {
      type: "totals-total";
    };

const compareNumbers = (left: number, right: number): number => left - right;

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const sortRows = (
  rows: ProjectCostRowResponse[],
  sort: AdminProjectCostsSort
): ProjectCostRowResponse[] => {
  const sorted = [...rows];

  sorted.sort((left, right) => {
    let value = 0;

    if (sort.key === "department") {
      value = left.departmentName.localeCompare(right.departmentName, "es");
    } else if (sort.key === "total") {
      value = compareNumbers(left.totalBase, right.totalBase);
    } else {
      const projectId = sort.key.replace(/^project:/, "");
      const leftProject = left.projects.find((project) => project.projectId === projectId);
      const rightProject = right.projects.find((project) => project.projectId === projectId);

      value = compareNumbers(
        leftProject?.baseCost ?? 0,
        rightProject?.baseCost ?? 0
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
  rows: ProjectCostRowResponse[];
  projects: Array<{ projectId: string; projectName: string }>;
  totals: ProjectCostTotalsResponse;
  sort: AdminProjectCostsSort;
  onSortChange: (sort: AdminProjectCostsSort) => void;
  onSelectCell: (selection: AdminProjectCostsCellSelection) => void;
}> = ({ rows, projects, totals, sort, onSortChange, onSelectCell }) => {
  const sortedRows = useMemo(() => sortRows(rows, sort), [rows, sort]);
  const directRows = useMemo(
    () => sortedRows.filter((row) => !row.isGeneralCostsDepartment),
    [sortedRows]
  );
  const generalRows = useMemo(
    () => sortedRows.filter((row) => row.isGeneralCostsDepartment),
    [sortedRows]
  );
  const columnCount = projects.length + 2;

  const directTotalByProject = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of directRows) {
      for (const cell of row.projects) {
        totals.set(cell.projectId, (totals.get(cell.projectId) ?? 0) + cell.baseCost);
      }
    }
    return totals;
  }, [directRows]);

  const directTotalGlobal = useMemo(
    () => Array.from(directTotalByProject.values()).reduce((acc, v) => acc + v, 0),
    [directTotalByProject]
  );

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
            {projects.length === 0 ? (
              <HeaderCell>
                <StaticHeaderLabel>Sin proyectos</StaticHeaderLabel>
              </HeaderCell>
            ) : (
              projects.map((project) => (
                <HeaderCell key={project.projectId}>
                  <SortButton
                    type="button"
                    onClick={() => toggleSort(`project:${project.projectId}`)}
                  >
                    {project.projectName}
                    {renderSortIndicator(sort, `project:${project.projectId}`)}
                  </SortButton>
                </HeaderCell>
              ))
            )}
            <StickyRightHeader>
              <SortButton type="button" onClick={() => toggleSort("total")}>
                Total{renderSortIndicator(sort, "total")}
              </SortButton>
            </StickyRightHeader>
          </tr>
        </thead>
        <tbody>
          {directRows.length > 0 && (
            <SectionRow>
              <SectionLabelCell colSpan={columnCount} $tone="direct">
                Costes directos
              </SectionLabelCell>
            </SectionRow>
          )}
          {directRows.map((row) => (
            <DataRow key={row.departmentId}>
              <StickyLeftCell>{row.departmentName}</StickyLeftCell>
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
                      {formatCurrency(cell?.baseCost ?? 0)}
                    </ValueButton>
                  </ValueCell>
                );
              })}
              {projects.length === 0 && <EmptyProjectsCell>Sin coste directo</EmptyProjectsCell>}
              <StickyRightCell>
                <ValueButton
                  type="button"
                  onClick={() => onSelectCell({ type: "row-total", rowId: row.departmentId })}
                >
                  {formatCurrency(row.totalBase)}
                </ValueButton>
              </StickyRightCell>
            </DataRow>
          ))}
          {directRows.length > 0 && (
            <SubtotalRow>
              <SubtotalStickyLeftCell>Total costes directos</SubtotalStickyLeftCell>
              {projects.map((project) => (
                <SubtotalCell key={project.projectId}>
                  {formatCurrency(directTotalByProject.get(project.projectId) ?? 0)}
                </SubtotalCell>
              ))}
              {projects.length === 0 && <SubtotalCell>-</SubtotalCell>}
              <SubtotalStickyRightCell>
                {formatCurrency(directTotalGlobal)}
              </SubtotalStickyRightCell>
            </SubtotalRow>
          )}
          {generalRows.length > 0 && (
            <SectionRow>
              <SectionLabelCell colSpan={columnCount} $tone="general">
                Gastos generales
              </SectionLabelCell>
            </SectionRow>
          )}
          {generalRows.map((row) => (
            <GeneralDataRow key={row.departmentId}>
              <GeneralStickyLeftCell>{row.departmentName}</GeneralStickyLeftCell>
              {projects.map((project) => {
                const cell =
                  row.projects.find((item) => item.projectId === project.projectId) ?? null;

                return (
                  <GeneralValueCell key={project.projectId}>
                    <GeneralValueButton
                      type="button"
                      onClick={() =>
                        onSelectCell({
                          type: "row-project",
                          rowId: row.departmentId,
                          projectId: project.projectId,
                        })
                      }
                    >
                      {formatCurrency(cell?.baseCost ?? 0)}
                    </GeneralValueButton>
                  </GeneralValueCell>
                );
              })}
              {projects.length === 0 && <GeneralEmptyProjectsCell>-</GeneralEmptyProjectsCell>}
              <GeneralStickyRightCell>
                <GeneralValueButton
                  type="button"
                  onClick={() => onSelectCell({ type: "row-total", rowId: row.departmentId })}
                >
                  {formatCurrency(row.totalBase)}
                </GeneralValueButton>
              </GeneralStickyRightCell>
            </GeneralDataRow>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <StickyLeftFooter>Total</StickyLeftFooter>
            {projects.length === 0 ? (
              <FooterCell>
                <MutedFooterText>Sin proyectos</MutedFooterText>
              </FooterCell>
            ) : (
              projects.map((project) => {
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
                      {formatCurrency(totalProject?.finalCost ?? 0)}
                    </ValueButton>
                  </FooterCell>
                );
              })
            )}
            <StickyRightFooter>
              <ValueButton type="button" onClick={() => onSelectCell({ type: "totals-total" })}>
                {formatCurrency(totals.totalFinal)}
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
  min-width: 220px;
`;

const StickyRightHeader = styled(BaseHeaderCell)`
  right: 0;
  z-index: 5;
`;

const StaticHeaderLabel = styled.div`
  min-height: 46px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: #4e4f53;
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

const GeneralValueCell = styled(BaseCell)`
  background: #fffaf1;
`;

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

const GeneralValueButton = styled(ValueButton)`
  background: #fffaf1;

  &:hover {
    background: rgba(200, 165, 100, 0.14);
  }
`;

const EmptyProjectsCell = styled.td`
  min-width: 160px;
  padding: 12px;
  text-align: center;
  color: #8b8c90;
  font-size: 13px;
  background: #fcfdff;
`;

const GeneralEmptyProjectsCell = styled(EmptyProjectsCell)`
  background: #fffaf1;
`;

const MutedFooterText = styled.div`
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  color: #8b8c90;
  font-size: 13px;
`;

const SectionRow = styled.tr`
  &:hover td,
  &:hover th {
    background: transparent;
  }
`;

const SectionLabelCell = styled.td<{ $tone: "direct" | "general" }>`
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #4e4f53;
  background: ${({ $tone }) => ($tone === "direct" ? "#edf4fb" : "#fff2dd")} !important;
  border-top: 3px solid ${({ $tone }) => ($tone === "direct" ? "#a9c3de" : "#d8b074")};
`;

const SubtotalRow = styled.tr`
  &:hover td,
  &:hover th {
    background: #edf4fb;
  }
`;

const SubtotalCell = styled.td`
  min-width: 160px;
  padding: 12px;
  text-align: right;
  font-size: 13px;
  font-weight: 700;
  color: #4e4f53;
  background: #edf4fb !important;
  border-top: 2px solid #a9c3de;
`;

const SubtotalStickyLeftCell = styled.th`
  position: sticky;
  left: 0;
  z-index: 2;
  min-width: 220px;
  padding: 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: #4e4f53;
  background: #edf4fb !important;
  border-top: 2px solid #a9c3de;
`;

const SubtotalStickyRightCell = styled.td`
  position: sticky;
  right: 0;
  z-index: 2;
  min-width: 160px;
  padding: 12px;
  text-align: right;
  font-size: 13px;
  font-weight: 700;
  color: #4e4f53;
  background: #edf4fb !important;
  border-top: 2px solid #a9c3de;
`;

const DataRow = styled.tr`
  &:hover td,
  &:hover th {
    background: #fbfbfb;
  }
`;

const GeneralDataRow = styled.tr`
  &:hover td,
  &:hover th {
    background: #fff6ea;
  }
`;

const GeneralStickyLeftCell = styled(StickyLeftCell)`
  background: #fffaf1;
`;

const GeneralStickyRightCell = styled(StickyRightCell)`
  background: #fffaf1;
`;

export default AdminProjectCostsTable;
