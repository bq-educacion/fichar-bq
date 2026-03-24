export const COMPANY_COST_MULTIPLIER = 1.3;
export const MONTHLY_GENERAL_COST_ROW_ID = "__monthly_general_cost__";
export const NO_DEPARTMENT_ROW_ID = "__no_department__";

export type ProjectCostSalaryHistoryEntry = {
  startDate: Date;
  grossSalary: number;
};

export type ProjectCostAllocationInput = {
  projectId: string;
  projectName: string;
  percentage: number;
};

export type ProjectCostMonthlyDedicationRecord = {
  dedications: Array<{
    projectId: string;
    dedication: number;
  }>;
};

export type ProjectCostDepartmentInput = {
  departmentId: string;
  departmentName: string;
  isGeneralCostsDepartment: boolean;
};

export type ProjectCostProjectInput = {
  projectId: string;
  projectName: string;
};

export type ProjectCostUserInput = {
  userId: string;
  userName: string;
  departmentId: string;
  departmentName: string;
  isGeneralCostsDepartment: boolean;
  salaryHistory: ProjectCostSalaryHistoryEntry[];
  allocations: ProjectCostAllocationInput[];
  allocationSourceDate: Date | null;
};

export type ProjectCostReportInput = {
  month: string;
  departments: ProjectCostDepartmentInput[];
  projects: ProjectCostProjectInput[];
  users: ProjectCostUserInput[];
  monthlyGeneralCost: number;
};

export type ProjectCostDetailItem = {
  kind: "user" | "monthly_general_cost";
  label: string;
  userId: string | null;
  userName: string | null;
  departmentId: string;
  departmentName: string;
  projectId: string | null;
  projectName: string | null;
  salaryEffectiveDate: Date | null;
  grossSalary: number | null;
  companyCost: number | null;
  allocationPercentage: number | null;
  assignedMonthlyCost: number;
  warning: string | null;
};

export type ProjectCostCell = {
  baseCost: number;
  finalCost: number;
  allocatedGeneralCost: number;
  details: ProjectCostDetailItem[];
  warnings: string[];
};

export type ProjectCostProjectCell = ProjectCostCell & {
  projectId: string;
  projectName: string;
};

export type ProjectCostRow = {
  departmentId: string;
  departmentName: string;
  isGeneralCostsDepartment: boolean;
  isSynthetic: boolean;
  generalCosts: ProjectCostCell;
  projects: ProjectCostProjectCell[];
  totalBase: number;
  totalFinal: number;
};

export type ProjectCostTotals = {
  generalCosts: ProjectCostCell;
  projects: ProjectCostProjectCell[];
  totalBase: number;
  totalFinal: number;
};

export type ProjectCostAllocationRow = {
  projectId: string;
  projectName: string;
  personnelCost: number;
  weight: number;
  allocatedGeneralCost: number;
  finalCost: number;
};

export type ProjectCostReport = {
  month: string;
  projects: ProjectCostProjectInput[];
  rows: ProjectCostRow[];
  totals: ProjectCostTotals;
  generalCostAllocation: ProjectCostAllocationRow[];
};

export type ProjectCostReportFilters = {
  departmentId?: string | null;
  projectId?: string | null;
};

export type ProjectCostReportSummary = {
  totalPersonnelCost: number;
  totalGeneralCosts: number;
  totalFinalCost: number;
  activeProjects: number;
};

export type ProjectCostReportView = {
  month: string;
  projects: ProjectCostProjectInput[];
  rows: ProjectCostRow[];
  totals: ProjectCostTotals;
  generalCostAllocation: ProjectCostAllocationRow[];
  summaries: {
    base: ProjectCostReportSummary;
    final: ProjectCostReportSummary;
  };
};

export type ProjectCostChartPoint = {
  month: string;
  baseCost: number;
  finalCost: number;
};

export type ProjectCostChartSeries = {
  projectId: string;
  projectName: string;
  points: ProjectCostChartPoint[];
};

const sumNumbers = (values: number[]): number =>
  values.reduce((acc, value) => acc + value, 0);

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values));

const buildUserWarning = (allocationTotal: number): string | null => {
  if (allocationTotal > 100) {
    return `Asignaciones superiores al 100% (${allocationTotal}%)`;
  }

  if (allocationTotal < 100) {
    return `Asignaciones incompletas (${allocationTotal}%)`;
  }

  return null;
};

const cloneCell = (cell: ProjectCostCell): ProjectCostCell => ({
  baseCost: cell.baseCost,
  finalCost: cell.finalCost,
  allocatedGeneralCost: cell.allocatedGeneralCost,
  details: [...cell.details],
  warnings: [...cell.warnings],
});

const cloneProjectCell = (cell: ProjectCostProjectCell): ProjectCostProjectCell => ({
  ...cloneCell(cell),
  projectId: cell.projectId,
  projectName: cell.projectName,
});

const buildEmptyCell = (): ProjectCostCell => ({
  baseCost: 0,
  finalCost: 0,
  allocatedGeneralCost: 0,
  details: [],
  warnings: [],
});

const normalizeSalaryHistory = (
  history: ProjectCostSalaryHistoryEntry[]
): ProjectCostSalaryHistoryEntry[] =>
  [...history]
    .map((entry) => ({
      startDate: new Date(entry.startDate),
      grossSalary: entry.grossSalary,
    }))
    .filter(
      (entry) =>
        !Number.isNaN(entry.startDate.getTime()) &&
        Number.isFinite(entry.grossSalary) &&
        entry.grossSalary >= 0
    );

export const resolveSalaryForMonthEnd = (
  history: ProjectCostSalaryHistoryEntry[],
  monthEnd: Date
): ProjectCostSalaryHistoryEntry | null => {
  const normalizedHistory = normalizeSalaryHistory(history);
  const targetTime = monthEnd.getTime();

  let resolved: ProjectCostSalaryHistoryEntry | null = null;
  let resolvedTime = Number.NEGATIVE_INFINITY;

  for (const entry of normalizedHistory) {
    const entryTime = entry.startDate.getTime();
    if (entryTime > targetTime) {
      continue;
    }

    if (entryTime >= resolvedTime) {
      resolved = entry;
      resolvedTime = entryTime;
    }
  }

  return resolved;
};

export const computeMonthlyCompanyCost = (grossSalary: number): number =>
  (grossSalary * COMPANY_COST_MULTIPLIER) / 12;

export const computeAverageMonthlyAllocations = (
  records: ProjectCostMonthlyDedicationRecord[],
  activeProjects: ProjectCostProjectInput[]
): ProjectCostAllocationInput[] => {
  const activeProjectNameById = new Map(
    activeProjects.map((project) => [project.projectId, project.projectName] as const)
  );
  const validRecords = records.filter((record) => record.dedications.length > 0);

  if (validRecords.length === 0) {
    return [];
  }

  const totalByProject = new Map<string, number>();

  for (const record of validRecords) {
    for (const dedication of record.dedications) {
      if (!activeProjectNameById.has(dedication.projectId)) {
        continue;
      }

      totalByProject.set(
        dedication.projectId,
        (totalByProject.get(dedication.projectId) ?? 0) + dedication.dedication
      );
    }
  }

  return activeProjects
    .map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      percentage: (totalByProject.get(project.projectId) ?? 0) / validRecords.length,
    }))
    .filter((allocation) => allocation.percentage > 0);
};

const buildRowMap = (
  departments: ProjectCostDepartmentInput[],
  projects: ProjectCostProjectInput[]
): Map<string, ProjectCostRow> => {
  const rows = new Map<string, ProjectCostRow>();

  for (const department of departments) {
    rows.set(department.departmentId, {
      departmentId: department.departmentId,
      departmentName: department.departmentName,
      isGeneralCostsDepartment: department.isGeneralCostsDepartment,
      isSynthetic: false,
      generalCosts: buildEmptyCell(),
      projects: projects.map((project) => ({
        ...buildEmptyCell(),
        projectId: project.projectId,
        projectName: project.projectName,
      })),
      totalBase: 0,
      totalFinal: 0,
    });
  }

  if (!rows.has(NO_DEPARTMENT_ROW_ID)) {
    rows.set(NO_DEPARTMENT_ROW_ID, {
      departmentId: NO_DEPARTMENT_ROW_ID,
      departmentName: "Sin departamento",
      isGeneralCostsDepartment: false,
      isSynthetic: true,
      generalCosts: buildEmptyCell(),
      projects: projects.map((project) => ({
        ...buildEmptyCell(),
        projectId: project.projectId,
        projectName: project.projectName,
      })),
      totalBase: 0,
      totalFinal: 0,
    });
  }

  return rows;
};

const getRowForDepartment = (
  rowMap: Map<string, ProjectCostRow>,
  departmentId: string
): ProjectCostRow => rowMap.get(departmentId) ?? rowMap.get(NO_DEPARTMENT_ROW_ID)!;

const addWarning = (cell: ProjectCostCell, warning: string | null) => {
  if (!warning || cell.warnings.includes(warning)) {
    return;
  }

  cell.warnings.push(warning);
};

const addDetailToGeneralCosts = (
  row: ProjectCostRow,
  detail: ProjectCostDetailItem,
  warning: string | null
) => {
  row.generalCosts.baseCost += detail.assignedMonthlyCost;
  row.generalCosts.details.push(detail);
  addWarning(row.generalCosts, warning);
};

const addDetailToProject = (
  row: ProjectCostRow,
  projectId: string,
  detail: ProjectCostDetailItem,
  warning: string | null
) => {
  const targetCell = row.projects.find((project) => project.projectId === projectId);
  if (!targetCell) {
    return;
  }

  targetCell.baseCost += detail.assignedMonthlyCost;
  targetCell.details.push(detail);
  addWarning(targetCell, warning);
};

const getProjectIdsWithCost = (projects: ProjectCostProjectCell[]): string[] =>
  projects
    .filter((project) => project.baseCost > 0 || project.finalCost > 0)
    .map((project) => project.projectId);

export const buildProjectCostReport = (
  input: ProjectCostReportInput,
  monthEnd: Date
): ProjectCostReport => {
  const projects = [...input.projects].sort((left, right) =>
    left.projectName.localeCompare(right.projectName, "es")
  );
  const rowMap = buildRowMap(input.departments, projects);
  const projectIds = new Set(projects.map((project) => project.projectId));

  for (const user of input.users) {
    const row = getRowForDepartment(rowMap, user.departmentId);
    const salaryEntry = resolveSalaryForMonthEnd(user.salaryHistory, monthEnd);
    if (!salaryEntry) {
      continue;
    }

    const monthlyCompanyCost = computeMonthlyCompanyCost(salaryEntry.grossSalary);

    if (user.isGeneralCostsDepartment) {
      addDetailToGeneralCosts(
        row,
        {
          kind: "user",
          label: user.userName,
          userId: user.userId,
          userName: user.userName,
          departmentId: row.departmentId,
          departmentName: row.departmentName,
          projectId: null,
          projectName: null,
          salaryEffectiveDate: salaryEntry.startDate,
          grossSalary: salaryEntry.grossSalary,
          companyCost: monthlyCompanyCost,
          allocationPercentage: 100,
          assignedMonthlyCost: monthlyCompanyCost,
          warning:
            user.allocations.length > 0
              ? "Departamento marcado como gastos generales; no se aplican asignaciones a proyecto"
              : null,
        },
        null
      );
      continue;
    }

    const allocations = user.allocations.filter(
      (allocation) =>
        projectIds.has(allocation.projectId) &&
        Number.isFinite(allocation.percentage) &&
        allocation.percentage > 0
    );
    const allocationTotal = allocations.reduce(
      (acc, allocation) => acc + allocation.percentage,
      0
    );
    const salaryWarning = buildUserWarning(allocationTotal);

    for (const allocation of allocations) {
      const assignedMonthlyCost = monthlyCompanyCost * (allocation.percentage / 100);
      addDetailToProject(
        row,
        allocation.projectId,
        {
          kind: "user",
          label: user.userName,
          userId: user.userId,
          userName: user.userName,
          departmentId: row.departmentId,
          departmentName: row.departmentName,
          projectId: allocation.projectId,
          projectName: allocation.projectName,
          salaryEffectiveDate: salaryEntry.startDate,
          grossSalary: salaryEntry.grossSalary,
          companyCost: monthlyCompanyCost,
          allocationPercentage: allocation.percentage,
          assignedMonthlyCost,
          warning:
            user.allocationSourceDate === null
              ? "Sin dedicaciones registradas en el mes"
              : salaryWarning,
        },
        salaryWarning
      );
    }

    const unassignedPercentage = Math.max(0, 100 - allocationTotal);
    if (unassignedPercentage > 0) {
      addDetailToGeneralCosts(
        row,
        {
          kind: "user",
          label: user.userName,
          userId: user.userId,
          userName: user.userName,
          departmentId: row.departmentId,
          departmentName: row.departmentName,
          projectId: null,
          projectName: null,
          salaryEffectiveDate: salaryEntry.startDate,
          grossSalary: salaryEntry.grossSalary,
          companyCost: monthlyCompanyCost,
          allocationPercentage: unassignedPercentage,
          assignedMonthlyCost: monthlyCompanyCost * (unassignedPercentage / 100),
          warning:
            allocationTotal === 0
              ? "Sin dedicaciones registradas en el mes; el coste queda en gastos generales"
              : salaryWarning,
        },
        salaryWarning
      );
    }
  }

  if (input.monthlyGeneralCost > 0) {
    rowMap.set(MONTHLY_GENERAL_COST_ROW_ID, {
      departmentId: MONTHLY_GENERAL_COST_ROW_ID,
      departmentName: "Coste general mensual",
      isGeneralCostsDepartment: true,
      isSynthetic: true,
      generalCosts: {
        ...buildEmptyCell(),
        baseCost: input.monthlyGeneralCost,
        details: [
          {
            kind: "monthly_general_cost",
            label: "Coste general mensual",
            userId: null,
            userName: null,
            departmentId: MONTHLY_GENERAL_COST_ROW_ID,
            departmentName: "Coste general mensual",
            projectId: null,
            projectName: null,
            salaryEffectiveDate: null,
            grossSalary: null,
            companyCost: null,
            allocationPercentage: null,
            assignedMonthlyCost: input.monthlyGeneralCost,
            warning: null,
          },
        ],
        warnings: [],
      },
      projects: projects.map((project) => ({
        ...buildEmptyCell(),
        projectId: project.projectId,
        projectName: project.projectName,
      })),
      totalBase: input.monthlyGeneralCost,
      totalFinal: 0,
    });
  }

  const rows = Array.from(rowMap.values())
    .map((row) => ({
      ...row,
      projects: [...row.projects].sort((left, right) =>
        left.projectName.localeCompare(right.projectName, "es")
      ),
      totalBase: 0,
      totalFinal: 0,
    }))
    .filter(
      (row) =>
        !row.isSynthetic ||
        row.generalCosts.baseCost > 0 ||
        row.projects.some((project) => project.baseCost > 0)
    )
    .sort((left, right) =>
      left.departmentName.localeCompare(right.departmentName, "es")
    );

  const projectTotals = projects.map((project) => ({
    ...buildEmptyCell(),
    projectId: project.projectId,
    projectName: project.projectName,
  }));

  const totalsGeneralCosts = buildEmptyCell();

  for (const row of rows) {
    totalsGeneralCosts.baseCost += row.generalCosts.baseCost;
    totalsGeneralCosts.details.push(...row.generalCosts.details);
    row.generalCosts.warnings.forEach((warning) => addWarning(totalsGeneralCosts, warning));

    row.projects.forEach((projectCell, index) => {
      projectTotals[index].baseCost += projectCell.baseCost;
      projectTotals[index].details.push(...projectCell.details);
      projectCell.warnings.forEach((warning) => addWarning(projectTotals[index], warning));
    });
  }

  const totalPersonnelCost = sumNumbers(projectTotals.map((project) => project.baseCost));
  const totalGeneralCosts = totalsGeneralCosts.baseCost;
  const keepGeneralCostsInFinal = totalPersonnelCost === 0;

  const generalCostAllocation = projectTotals.map((project) => {
    const weight = totalPersonnelCost === 0 ? 0 : project.baseCost / totalPersonnelCost;
    const allocatedGeneralCost = totalGeneralCosts * weight;
    project.allocatedGeneralCost = allocatedGeneralCost;
    project.finalCost =
      project.baseCost + allocatedGeneralCost + (keepGeneralCostsInFinal ? 0 : 0);

    return {
      projectId: project.projectId,
      projectName: project.projectName,
      personnelCost: project.baseCost,
      weight,
      allocatedGeneralCost,
      finalCost: project.finalCost,
    };
  });

  totalsGeneralCosts.finalCost = keepGeneralCostsInFinal ? totalsGeneralCosts.baseCost : 0;

  for (const row of rows) {
    row.generalCosts.finalCost = keepGeneralCostsInFinal ? row.generalCosts.baseCost : 0;
    row.totalBase = row.generalCosts.baseCost;
    row.totalFinal = row.generalCosts.finalCost;

    row.projects = row.projects.map((projectCell) => {
      const projectAllocation = generalCostAllocation.find(
        (project) => project.projectId === projectCell.projectId
      );
      const allocatedGeneralCost =
        projectAllocation && projectAllocation.personnelCost > 0
          ? projectAllocation.allocatedGeneralCost *
            (projectCell.baseCost / projectAllocation.personnelCost)
          : 0;

      const nextCell: ProjectCostProjectCell = {
        ...projectCell,
        allocatedGeneralCost,
        finalCost: projectCell.baseCost + allocatedGeneralCost,
      };

      row.totalBase += nextCell.baseCost;
      row.totalFinal += nextCell.finalCost;
      return nextCell;
    });
  }

  const totals: ProjectCostTotals = {
    generalCosts: totalsGeneralCosts,
    projects: projectTotals,
    totalBase: totalsGeneralCosts.baseCost + sumNumbers(projectTotals.map((project) => project.baseCost)),
    totalFinal:
      totalsGeneralCosts.finalCost + sumNumbers(projectTotals.map((project) => project.finalCost)),
  };

  return {
    month: input.month,
    projects,
    rows,
    totals,
    generalCostAllocation,
  };
};

const filterProjects = (
  projects: ProjectCostProjectInput[],
  projectId?: string | null
): ProjectCostProjectInput[] =>
  projectId ? projects.filter((project) => project.projectId === projectId) : projects;

const filterProjectCells = (
  projects: ProjectCostProjectCell[],
  projectId?: string | null
): ProjectCostProjectCell[] =>
  projectId ? projects.filter((project) => project.projectId === projectId) : projects;

export const buildProjectCostReportSummary = (
  totals: ProjectCostTotals,
  mode: "base" | "final"
): ProjectCostReportSummary => {
  const activeProjects = getProjectIdsWithCost(totals.projects).length;

  return {
    totalPersonnelCost: sumNumbers(totals.projects.map((project) => project.baseCost)),
    totalGeneralCosts:
      mode === "base"
        ? totals.generalCosts.baseCost
        : totals.generalCosts.finalCost +
          sumNumbers(totals.projects.map((project) => project.allocatedGeneralCost)),
    totalFinalCost: mode === "base" ? totals.totalBase : totals.totalFinal,
    activeProjects,
  };
};

export const filterProjectCostReport = (
  report: ProjectCostReport,
  filters: ProjectCostReportFilters
): ProjectCostReportView => {
  const visibleProjects = filterProjects(report.projects, filters.projectId);
  const visibleRows = (filters.departmentId
    ? report.rows.filter((row) => row.departmentId === filters.departmentId)
    : report.rows
  ).map((row) => {
    const projectCells = filterProjectCells(row.projects, filters.projectId).map(cloneProjectCell);
    const generalCosts = cloneCell(row.generalCosts);
    const totalBase = generalCosts.baseCost + sumNumbers(projectCells.map((project) => project.baseCost));
    const totalFinal = generalCosts.finalCost + sumNumbers(projectCells.map((project) => project.finalCost));

    return {
      ...row,
      generalCosts,
      projects: projectCells,
      totalBase,
      totalFinal,
    };
  });

  const totalsGeneralCosts = buildEmptyCell();
  const projectTotals = visibleProjects.map((project) => ({
    ...buildEmptyCell(),
    projectId: project.projectId,
    projectName: project.projectName,
  }));

  for (const row of visibleRows) {
    totalsGeneralCosts.baseCost += row.generalCosts.baseCost;
    totalsGeneralCosts.finalCost += row.generalCosts.finalCost;
    totalsGeneralCosts.details.push(...row.generalCosts.details);
    row.generalCosts.warnings.forEach((warning) => addWarning(totalsGeneralCosts, warning));

    row.projects.forEach((projectCell, index) => {
      projectTotals[index].baseCost += projectCell.baseCost;
      projectTotals[index].finalCost += projectCell.finalCost;
      projectTotals[index].allocatedGeneralCost += projectCell.allocatedGeneralCost;
      projectTotals[index].details.push(...projectCell.details);
      projectCell.warnings.forEach((warning) => addWarning(projectTotals[index], warning));
    });
  }

  const totals: ProjectCostTotals = {
    generalCosts: totalsGeneralCosts,
    projects: projectTotals,
    totalBase: totalsGeneralCosts.baseCost + sumNumbers(projectTotals.map((project) => project.baseCost)),
    totalFinal:
      totalsGeneralCosts.finalCost + sumNumbers(projectTotals.map((project) => project.finalCost)),
  };

  const generalCostAllocation = (filters.projectId
    ? report.generalCostAllocation.filter(
        (project) => project.projectId === filters.projectId
      )
    : report.generalCostAllocation
  ).map((project) => ({ ...project }));

  return {
    month: report.month,
    projects: visibleProjects.map((project) => ({ ...project })),
    rows: visibleRows,
    totals,
    generalCostAllocation,
    summaries: {
      base: buildProjectCostReportSummary(totals, "base"),
      final: buildProjectCostReportSummary(totals, "final"),
    },
  };
};

export const buildProjectCostChartSeries = (
  views: ProjectCostReportView[]
): ProjectCostChartSeries[] => {
  const projectIds = uniqueStrings(
    views.flatMap((view) => view.projects.map((project) => project.projectId))
  );

  return projectIds
    .map((projectId) => {
      const projectName =
        views
          .flatMap((view) => view.projects)
          .find((project) => project.projectId === projectId)?.projectName ?? projectId;

      return {
        projectId,
        projectName,
        points: views.map((view) => {
          const totals = view.totals.projects.find((project) => project.projectId === projectId);
          return {
            month: view.month,
            baseCost: totals?.baseCost ?? 0,
            finalCost: totals?.finalCost ?? 0,
          };
        }),
      };
    })
    .sort((left, right) => left.projectName.localeCompare(right.projectName, "es"));
};
