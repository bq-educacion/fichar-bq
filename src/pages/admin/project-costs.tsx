import AdminProjectCostChart from "@/components/AdminProjectCostChart";
import AdminProjectCostDetailPanel from "@/components/AdminProjectCostDetailPanel";
import AdminProjectCostsTable, {
  type AdminProjectCostsCellSelection,
  type AdminProjectCostsSort,
} from "@/components/AdminProjectCostsTable";
import AdminSectionTabs from "@/components/AdminSectionTabs";
import getUserByEmail from "@/controllers/getUser";
import connectMongo from "@/lib/connectMongo";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  type AdminProjectCostReportResponse,
  type ProjectCostDetailItemResponse,
  adminProjectCostReportResponseSchema,
} from "@/schemas/projectCosts";
import SimpleContainer from "@/ui/SimpleContainer";
import styled from "@emotion/styled";
import type { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

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

const uniqueWarnings = (warnings: string[]): string[] =>
  Array.from(new Set(warnings.filter(Boolean)));

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
  const [sort, setSort] = useState<AdminProjectCostsSort>({
    key: "department",
    direction: "asc",
  });
  const [report, setReport] = useState<AdminProjectCostReportResponse | null>(null);
  const [detailPanel, setDetailPanel] = useState<DetailPanelState | null>(null);
  const [loading, setLoading] = useState(false);
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

  const selectedSummary = report?.summaries.base ?? null;

  const rowById = useMemo(
    () => new Map((report?.rows ?? []).map((row) => [row.departmentId, row] as const)),
    [report?.rows]
  );

  const openDetailPanel = (selection: AdminProjectCostsCellSelection) => {
    if (!report) {
      return;
    }

    const concatDetails = (...detailSets: ProjectCostDetailItemResponse[][]) =>
      detailSets.flat();
    const concatWarnings = (...warningSets: string[][]) =>
      uniqueWarnings(warningSets.flat());

    if (selection.type === "row-project") {
      const row = rowById.get(selection.rowId);
      const cell = row?.projects.find((project) => project.projectId === selection.projectId);
      if (!row || !cell) {
        return;
      }

      setDetailPanel({
        title: `${row.departmentName} · ${cell.projectName}`,
        value: cell.baseCost,
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
        value: row.totalBase,
        details: concatDetails(
          ...row.projects.map((project) => project.details)
        ),
        warnings: concatWarnings(
          ...row.projects.map((project) => project.warnings)
        ),
        allocatedGeneralCost: row.projects.reduce(
          (acc, project) => acc + project.allocatedGeneralCost,
          0
        ),
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
        value: totalCell.finalCost,
        details: totalCell.details,
        warnings: totalCell.warnings,
        allocatedGeneralCost: totalCell.allocatedGeneralCost,
      });
      return;
    }

    setDetailPanel({
      title: "Total general",
      value: report.totals.totalFinal,
      details: concatDetails(
        ...report.totals.projects.map((project) => project.details)
      ),
      warnings: concatWarnings(
        ...report.totals.projects.map((project) => project.warnings)
      ),
      allocatedGeneralCost: report.totals.projects.reduce(
        (acc, project) => acc + project.allocatedGeneralCost,
        0
      ),
    });
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
            </FiltersCard>

            {selectedSummary && (
              <KpiGrid>
                <KpiCard>
                  <KpiLabel>Total coste directo</KpiLabel>
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
                  Las filas se agrupan primero por departamentos de coste directo y, debajo,
                  en un bloque separado, por departamentos de gastos generales. Los gastos
                  generales se distribuyen proporcionalmente según el peso del coste directo
                  de cada proyecto. Haz clic en cualquier celda para ver el detalle.
                </HelperText>
              </div>
            </SectionHeader>

            {loading || !report ? (
              <LoadingText>Cargando informe...</LoadingText>
            ) : (
              <AdminProjectCostsTable
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
                <SectionTitle>Serie temporal</SectionTitle>
                <HelperText>
                  Evolución de los últimos seis meses para los proyectos visibles.
                </HelperText>
              </div>
            </SectionHeader>
            {loading || !report ? (
              <LoadingText>Cargando serie...</LoadingText>
            ) : (
              <AdminProjectCostChart mode="final" series={report.chart} />
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
        mode="base"
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
