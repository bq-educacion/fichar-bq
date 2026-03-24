import AdminProjectCostAllocationTable from "@/components/AdminProjectCostAllocationTable";
import AdminProjectCostChart from "@/components/AdminProjectCostChart";
import AdminProjectCostDetailPanel from "@/components/AdminProjectCostDetailPanel";
import AdminProjectCostsTable, {
  AdminProjectCostsCellSelection,
  AdminProjectCostsMode,
  AdminProjectCostsSort,
} from "@/components/AdminProjectCostsTable";
import AdminSectionTabs from "@/components/AdminSectionTabs";
import getUserByEmail from "@/controllers/getUser";
import connectMongo from "@/lib/connectMongo";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  AdminProjectCostReportResponse,
  ProjectCostDetailItemResponse,
  ProjectCostProjectCellResponse,
  ProjectCostRowResponse,
  adminProjectCostReportResponseSchema,
} from "@/schemas/projectCosts";
import SimpleContainer from "@/ui/SimpleContainer";
import styled from "@emotion/styled";
import { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";

const ADMIN_PANEL_MAX_WIDTH = "1440px";

type PageProps = {
  initialMonth: string;
};

type DetailPanelState = {
  title: string;
  value: number;
  details: ProjectCostDetailItemResponse[];
  warnings: string[];
  allocatedGeneralCost: number;
};

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const getCurrentMonthInput = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
};

const getDisplayedCellValue = (
  mode: AdminProjectCostsMode,
  cell: Pick<ProjectCostProjectCellResponse, "baseCost" | "finalCost">
): number => (mode === "base" ? cell.baseCost : cell.finalCost);

const getDisplayedGeneralValue = (
  mode: AdminProjectCostsMode,
  cell: Pick<ProjectCostRowResponse["generalCosts"], "baseCost" | "finalCost">
): number => (mode === "base" ? cell.baseCost : cell.finalCost);

const getDisplayedTotalValue = (
  mode: AdminProjectCostsMode,
  row: Pick<ProjectCostRowResponse | AdminProjectCostReportResponse["totals"], "totalBase" | "totalFinal">
): number => (mode === "base" ? row.totalBase : row.totalFinal);

const uniqueWarnings = (warnings: string[]): string[] =>
  Array.from(new Set(warnings.filter(Boolean)));

const parseAmountInput = (value: string): number | null => {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.email) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  await connectMongo();

  const user = await getUserByEmail(session.user.email);
  if (!user.legal) {
    return {
      redirect: {
        destination: "/legal",
        permanent: false,
      },
    };
  }

  if (!user.admin) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
      initialMonth: getCurrentMonthInput(),
    },
  };
};

const AdminProjectCostsPage: NextPage<PageProps> = ({ initialMonth }) => {
  const router = useRouter();

  const [month, setMonth] = useState(initialMonth);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [mode, setMode] = useState<AdminProjectCostsMode>("base");
  const [sort, setSort] = useState<AdminProjectCostsSort>({
    key: "department",
    direction: "asc",
  });
  const [report, setReport] = useState<AdminProjectCostReportResponse | null>(null);
  const [generalCostDraft, setGeneralCostDraft] = useState("0");
  const [detailPanel, setDetailPanel] = useState<DetailPanelState | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingGeneralCost, setSavingGeneralCost] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError("");

      try {
        const query = new URLSearchParams({ month });
        if (selectedDepartmentId) {
          query.set("departmentId", selectedDepartmentId);
        }
        if (selectedProjectId) {
          query.set("projectId", selectedProjectId);
        }

        const response = await fetch(`/api/admin/project-costs?${query.toString()}`, {
          cache: "no-store",
        });

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        if (response.status === 403) {
          router.push("/");
          return;
        }

        if (!response.ok) {
          throw new Error((await response.text()) || "No se pudo cargar el informe");
        }

        const payload = adminProjectCostReportResponseSchema.parse(await response.json());
        setReport(payload);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo cargar el informe"
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchReport();
  }, [month, router, selectedDepartmentId, selectedProjectId]);

  useEffect(() => {
    if (!report) {
      return;
    }

    setGeneralCostDraft(String(report.generalCostInput.amount));
  }, [report?.generalCostInput.amount, report]);

  const selectedSummary = report?.summaries[mode] ?? null;

  const rowById = useMemo(
    () => new Map((report?.rows ?? []).map((row) => [row.departmentId, row] as const)),
    [report?.rows]
  );

  const projectNameById = useMemo(
    () =>
      new Map(
        (report?.projects ?? []).map((project) => [project.projectId, project.projectName] as const)
      ),
    [report?.projects]
  );

  const openDetailPanel = (selection: AdminProjectCostsCellSelection) => {
    if (!report) {
      return;
    }

    const concatDetails = (...detailSets: ProjectCostDetailItemResponse[][]) =>
      detailSets.flat();
    const concatWarnings = (...warningSets: string[][]) =>
      uniqueWarnings(warningSets.flat());

    if (selection.type === "row-general") {
      const row = rowById.get(selection.rowId);
      if (!row) {
        return;
      }

      setDetailPanel({
        title: `${row.departmentName} · Gastos generales`,
        value: getDisplayedGeneralValue(mode, row.generalCosts),
        details: row.generalCosts.details,
        warnings: row.generalCosts.warnings,
        allocatedGeneralCost: row.generalCosts.allocatedGeneralCost,
      });
      return;
    }

    if (selection.type === "row-project") {
      const row = rowById.get(selection.rowId);
      const cell = row?.projects.find((project) => project.projectId === selection.projectId);
      if (!row || !cell) {
        return;
      }

      setDetailPanel({
        title: `${row.departmentName} · ${cell.projectName}`,
        value: getDisplayedCellValue(mode, cell),
        details: cell.details,
        warnings: cell.warnings,
        allocatedGeneralCost: cell.allocatedGeneralCost,
      });
      return;
    }

    if (selection.type === "row-total") {
      const row = rowById.get(selection.rowId);
      if (!row) {
        return;
      }

      setDetailPanel({
        title: `${row.departmentName} · Total`,
        value: getDisplayedTotalValue(mode, row),
        details: concatDetails(
          row.generalCosts.details,
          ...row.projects.map((project) => project.details)
        ),
        warnings: concatWarnings(
          row.generalCosts.warnings,
          ...row.projects.map((project) => project.warnings)
        ),
        allocatedGeneralCost: row.projects.reduce(
          (acc, project) => acc + project.allocatedGeneralCost,
          0
        ),
      });
      return;
    }

    if (selection.type === "totals-general") {
      setDetailPanel({
        title: "Total · Gastos generales",
        value: getDisplayedGeneralValue(mode, report.totals.generalCosts),
        details: report.totals.generalCosts.details,
        warnings: report.totals.generalCosts.warnings,
        allocatedGeneralCost: report.totals.generalCosts.allocatedGeneralCost,
      });
      return;
    }

    if (selection.type === "totals-project") {
      const totalCell = report.totals.projects.find(
        (project) => project.projectId === selection.projectId
      );
      if (!totalCell) {
        return;
      }

      setDetailPanel({
        title: `Total · ${totalCell.projectName}`,
        value: getDisplayedCellValue(mode, totalCell),
        details: totalCell.details,
        warnings: totalCell.warnings,
        allocatedGeneralCost: totalCell.allocatedGeneralCost,
      });
      return;
    }

    setDetailPanel({
      title: "Total general",
      value: getDisplayedTotalValue(mode, report.totals),
      details: concatDetails(
        report.totals.generalCosts.details,
        ...report.totals.projects.map((project) => project.details)
      ),
      warnings: concatWarnings(
        report.totals.generalCosts.warnings,
        ...report.totals.projects.map((project) => project.warnings)
      ),
      allocatedGeneralCost: report.totals.projects.reduce(
        (acc, project) => acc + project.allocatedGeneralCost,
        0
      ),
    });
  };

  const saveGeneralCost = async () => {
    const parsedAmount = parseAmountInput(generalCostDraft);
    if (parsedAmount === null) {
      setError("Introduce un importe válido para los gastos generales");
      return;
    }

    setSavingGeneralCost(true);
    setError("");

    try {
      const response = await fetch("/api/admin/project-costs", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month,
          amount: parsedAmount,
        }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 403) {
        router.push("/");
        return;
      }

      if (!response.ok) {
        throw new Error((await response.text()) || "No se pudo guardar el gasto general");
      }

      const query = new URLSearchParams({ month });
      if (selectedDepartmentId) {
        query.set("departmentId", selectedDepartmentId);
      }
      if (selectedProjectId) {
        query.set("projectId", selectedProjectId);
      }

      const refreshResponse = await fetch(`/api/admin/project-costs?${query.toString()}`, {
        cache: "no-store",
      });
      if (!refreshResponse.ok) {
        throw new Error((await refreshResponse.text()) || "No se pudo refrescar el informe");
      }

      const payload = adminProjectCostReportResponseSchema.parse(
        await refreshResponse.json()
      );
      setReport(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar el gasto general"
      );
    } finally {
      setSavingGeneralCost(false);
    }
  };

  return (
    <>
      <AdminSectionTabs active="project-costs" maxWidth={ADMIN_PANEL_MAX_WIDTH} />
      <SimpleContainer
        title="Administración · Costes por proyecto"
        textColor="#4e4f53"
        fontSize="14px"
        height="40px"
        backgroundImage="linear-gradient(220deg, #eee, #eee)"
        maxWidth={ADMIN_PANEL_MAX_WIDTH}
      >
        <Content>
          <PanelSection>
            <TopGrid>
              <FiltersCard>
                <SectionTitle>Filtros</SectionTitle>
                <FiltersGrid>
                  <Field>
                    <Label>Mes</Label>
                    <Input
                      type="month"
                      value={month}
                      onChange={(event) => setMonth(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <Label>Departamento</Label>
                    <Select
                      value={selectedDepartmentId}
                      onChange={(event) => setSelectedDepartmentId(event.target.value)}
                    >
                      <option value="">Todos</option>
                      {report?.filters.departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field>
                    <Label>Proyecto</Label>
                    <Select
                      value={selectedProjectId}
                      onChange={(event) => setSelectedProjectId(event.target.value)}
                    >
                      <option value="">Todos</option>
                      {report?.filters.projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </FiltersGrid>
                <ToggleRow>
                  <ToggleButton
                    type="button"
                    $active={mode === "base"}
                    onClick={() => setMode("base")}
                  >
                    Base (coste personal)
                  </ToggleButton>
                  <ToggleButton
                    type="button"
                    $active={mode === "final"}
                    onClick={() => setMode("final")}
                  >
                    Con gastos generales
                  </ToggleButton>
                </ToggleRow>
              </FiltersCard>

              <FiltersCard>
                <SectionTitle>Gasto general mensual</SectionTitle>
                <HelperText>
                  Este importe se añade al pool de gastos generales del mes antes del reparto
                  proporcional por proyecto.
                </HelperText>
                <SaveRow>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={generalCostDraft}
                    onChange={(event) => setGeneralCostDraft(event.target.value)}
                    placeholder="0"
                  />
                  <PrimaryButton type="button" onClick={saveGeneralCost} disabled={savingGeneralCost}>
                    {savingGeneralCost ? "Guardando..." : "Guardar"}
                  </PrimaryButton>
                </SaveRow>
              </FiltersCard>
            </TopGrid>

            {selectedSummary && (
              <KpiGrid>
                <KpiCard>
                  <KpiLabel>Total coste personal</KpiLabel>
                  <KpiValue>{currencyFormatter.format(selectedSummary.totalPersonnelCost)}</KpiValue>
                </KpiCard>
                <KpiCard>
                  <KpiLabel>Total gastos generales</KpiLabel>
                  <KpiValue>{currencyFormatter.format(selectedSummary.totalGeneralCosts)}</KpiValue>
                </KpiCard>
                <KpiCard>
                  <KpiLabel>Total final</KpiLabel>
                  <KpiValue>{currencyFormatter.format(selectedSummary.totalFinalCost)}</KpiValue>
                </KpiCard>
                <KpiCard>
                  <KpiLabel>Proyectos activos</KpiLabel>
                  <KpiValue>{String(selectedSummary.activeProjects)}</KpiValue>
                </KpiCard>
              </KpiGrid>
            )}

            {error && <ErrorText>{error}</ErrorText>}
          </PanelSection>

          <PanelSection>
            <SectionHeader>
              <div>
                <SectionTitle>Matriz mensual por departamento y proyecto</SectionTitle>
                <HelperText>
                  Haz clic en cualquier celda para ver el detalle auditable del cálculo.
                  {mode === "final" &&
                    " En modo final la columna de gastos generales queda a cero porque el pool ya está repartido por proyecto."}
                </HelperText>
              </div>
            </SectionHeader>

            {loading || !report ? (
              <LoadingText>Cargando informe...</LoadingText>
            ) : (
              <AdminProjectCostsTable
                mode={mode}
                rows={report.rows}
                projects={report.projects}
                totals={report.totals}
                sort={sort}
                onSortChange={setSort}
                onSelectCell={openDetailPanel}
              />
            )}
          </PanelSection>

          <PanelSection>
            <SectionHeader>
              <div>
                <SectionTitle>Reparto de gastos generales</SectionTitle>
                <HelperText>
                  La distribución usa el peso del coste personal directo de cada proyecto sobre
                  el total del mes filtrado.
                </HelperText>
              </div>
            </SectionHeader>
            {loading || !report ? (
              <LoadingText>Cargando reparto...</LoadingText>
            ) : (
              <AdminProjectCostAllocationTable rows={report.generalCostAllocation} />
            )}
          </PanelSection>

          <PanelSection>
            <SectionHeader>
              <div>
                <SectionTitle>Serie temporal</SectionTitle>
                <HelperText>
                  Evolución de los últimos seis meses para los proyectos visibles, usando el
                  mismo modo de visualización.
                </HelperText>
              </div>
            </SectionHeader>
            {loading || !report ? (
              <LoadingText>Cargando serie...</LoadingText>
            ) : (
              <AdminProjectCostChart mode={mode} series={report.chart} />
            )}
          </PanelSection>

          <PanelSection>
            <SectionHeader>
              <div>
                <SectionTitle>Fórmulas y supuestos</SectionTitle>
                <HelperText>
                  Nota de desarrollo incluida en la propia vista para facilitar revisión y auditoría.
                </HelperText>
              </div>
            </SectionHeader>
            <NotesList>
              {(report?.developerNote ?? []).map((note) => (
                <NoteItem key={note}>{note}</NoteItem>
              ))}
            </NotesList>
          </PanelSection>
        </Content>
      </SimpleContainer>
      <AdminProjectCostDetailPanel
        open={detailPanel !== null}
        title={detailPanel?.title ?? ""}
        value={detailPanel?.value ?? 0}
        mode={mode}
        details={detailPanel?.details ?? []}
        warnings={detailPanel?.warnings ?? []}
        allocatedGeneralCost={detailPanel?.allocatedGeneralCost ?? 0}
        onClose={() => setDetailPanel(null)}
      />
      <br />
      <br />
    </>
  );
};

const Content = styled.div`
  width: 100%;
  border-top: 2px solid #fff;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PanelSection = styled.div`
  background: #eee;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const TopGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const FiltersCard = styled.div`
  background: #f8f8f8;
  border: 1px solid #dedede;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: #4e4f53;
`;

const Input = styled.input`
  height: 40px;
  border: 1px solid #d3d3d3;
  border-radius: 4px;
  background: #fff;
  padding: 0 12px;
  font-size: 14px;
  color: #4e4f53;
  outline: none;

  &:focus {
    border-color: #8a4d92;
  }
`;

const Select = styled.select`
  height: 40px;
  border: 1px solid #d3d3d3;
  border-radius: 4px;
  background: #fff;
  padding: 0 12px;
  font-size: 14px;
  color: #4e4f53;
`;

const ToggleRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  border: 1px solid ${({ $active }) => ($active ? "#8a4d92" : "#d0d0d0")};
  border-radius: 999px;
  min-height: 38px;
  padding: 0 14px;
  background: ${({ $active }) => ($active ? "#fff2ff" : "#fff")};
  color: #4e4f53;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`;

const SaveRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const PrimaryButton = styled.button`
  border: none;
  border-radius: 4px;
  min-height: 40px;
  padding: 0 16px;
  background-image: linear-gradient(256deg, #b68fbb, #ff5776);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: wait;
  }
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const KpiCard = styled.div`
  background: #fff;
  border: 1px solid #dedede;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const KpiLabel = styled.div`
  font-size: 12px;
  text-transform: uppercase;
  color: #7a7b80;
  font-weight: 700;
`;

const KpiValue = styled.div`
  font-size: 24px;
  line-height: 1.2;
  color: #4e4f53;
  font-weight: 700;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`;

const SectionTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #4e4f53;
`;

const HelperText = styled.div`
  margin-top: 4px;
  font-size: 13px;
  color: #6d6e72;
`;

const LoadingText = styled.div`
  color: #4e4f53;
  font-size: 14px;
  padding: 12px 0;
`;

const ErrorText = styled.div`
  color: #b00020;
  font-size: 13px;
  font-weight: 700;
`;

const NotesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const NoteItem = styled.div`
  background: #fff;
  border: 1px solid #e1e1e1;
  border-radius: 6px;
  padding: 12px;
  font-size: 13px;
  color: #4e4f53;
`;

export default AdminProjectCostsPage;
