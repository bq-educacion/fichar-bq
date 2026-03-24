export const COMPANY_COST_MULTIPLIER = 1.3;
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
};

export type ProjectCostDetailItem = {
  kind: "user";
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
  projects: ProjectCostProjectCell[];
  total: number;
};

export type ProjectCostTotals = {
  projects: ProjectCostProjectCell[];
  totalBase: number;
  totalFinal: number;
};

export type ProjectCostReport = {
  month: string;
  projects: ProjectCostProjectInput[];
  rows: ProjectCostRow[];
  totals: ProjectCostTotals;
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
  summary: ProjectCostReportSummary;
};

export type ProjectCostChartPoint = {
  month: string;
  cost: number;
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

type InternalRow = ProjectCostRow & {
  _generalCostPool: ProjectCostCell;
};

const buildRowMap = (
  departments: ProjectCostDepartmentInput[],
  projects: ProjectCostProjectInput[]
): Map<string, InternalRow> => {
  const rows = new Map<string, InternalRow>();

  for (const department of departments) {
    rows.set(department.departmentId, {
      departmentId: department.departmentId,
      departmentName: department.departmentName,
      isGeneralCostsDepartment: department.isGeneralCostsDepartment,
      isSynthetic: false,
      _generalCostPool: buildEmptyCell(),
      projects: projects.map((project) => ({
        ...buildEmptyCell(),
        projectId: project.projectId,
        projectName: project.projectName,
      })),
      total: 0,
    });
  }

  if (!rows.has(NO_DEPARTMENT_ROW_ID)) {
    rows.set(NO_DEPARTMENT_ROW_ID, {
      departmentId: NO_DEPARTMENT_ROW_ID,
      departmentName: "Sin departamento",
      isGeneralCostsDepartment: false,
      isSynthetic: true,
      _generalCostPool: buildEmptyCell(),
      projects: projects.map((project) => ({
        ...buildEmptyCell(),
        projectId: project.projectId,
        projectName: project.projectName,
      })),
      total: 0,
    });
  }

  return rows;
};

const getRowForDepartment = (
  rowMap: Map<string, InternalRow>,
  departmentId: string
): InternalRow => rowMap.get(departmentId) ?? rowMap.get(NO_DEPARTMENT_ROW_ID)!;

const addWarning = (cell: ProjectCostCell, warning: string | null) => {
  if (!warning || cell.warnings.includes(warning)) {
    return;
  }

  cell.warnings.push(warning);
};

const addDetailToGeneralCostPool = (
  row: InternalRow,
  detail: ProjectCostDetailItem,
  warning: string | null
) => {
  row._generalCostPool.baseCost += detail.assignedMonthlyCost;
  row._generalCostPool.details.push(detail);
  addWarning(row._generalCostPool, warning);
};

const addDetailToProject = (
  row: InternalRow,
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
    .filter((project) => project.baseCost > 0 || project.allocatedGeneralCost > 0)
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
      addDetailToGeneralCostPool(
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
      addDetailToGeneralCostPool(
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

  const internalRows = Array.from(rowMap.values())
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
        row._generalCostPool.baseCost > 0 ||
        row.projects.some((project) => project.baseCost > 0)
    )
    .sort((left, right) =>
      left.departmentName.localeCompare(right.departmentName, "es")
    );

  const directRows = internalRows.filter((row) => !row.isGeneralCostsDepartment);
  const generalRows = internalRows.filter((row) => row.isGeneralCostsDepartment);

  const directTotalByProject = new Map<string, number>();
  for (const row of directRows) {
    for (const projectCell of row.projects) {
      directTotalByProject.set(
        projectCell.projectId,
        (directTotalByProject.get(projectCell.projectId) ?? 0) + projectCell.baseCost
      );
    }
  }
  const totalDirectoGlobal = sumNumbers(Array.from(directTotalByProject.values()));

  for (const row of generalRows) {
    const departmentTotal = row._generalCostPool.baseCost;

    for (const projectCell of row.projects) {
      const directProjectCost = directTotalByProject.get(projectCell.projectId) ?? 0;
      const weight = totalDirectoGlobal === 0 ? 0 : directProjectCost / totalDirectoGlobal;
      projectCell.baseCost = departmentTotal * weight;
    }
  }

  const rows: ProjectCostRow[] = internalRows.map((row) => ({
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    isGeneralCostsDepartment: row.isGeneralCostsDepartment,
    isSynthetic: row.isSynthetic,
    projects: row.projects,
    total: sumNumbers(row.projects.map((p) => p.baseCost)),
  }));

  const projectTotals: ProjectCostProjectCell[] = projects.map((project) => {
    const baseCost = sumNumbers(
      directRows.map(
        (row) =>
          row.projects.find((p) => p.projectId === project.projectId)?.baseCost ?? 0
      )
    );
    const allocatedGeneralCost = sumNumbers(
      generalRows.map(
        (row) =>
          row.projects.find((p) => p.projectId === project.projectId)?.baseCost ?? 0
      )
    );
    return {
      ...buildEmptyCell(),
      projectId: project.projectId,
      projectName: project.projectName,
      baseCost,
      allocatedGeneralCost,
      details: internalRows.flatMap(
        (row) =>
          row.projects.find((p) => p.projectId === project.projectId)?.details ?? []
      ),
      warnings: Array.from(
        new Set(
          internalRows.flatMap(
            (row) =>
              row.projects.find((p) => p.projectId === project.projectId)?.warnings ?? []
          )
        )
      ),
    };
  });

  const totals: ProjectCostTotals = {
    projects: projectTotals,
    totalBase: sumNumbers(projectTotals.map((p) => p.baseCost)),
    totalFinal: sumNumbers(
      projectTotals.map((p) => p.baseCost + p.allocatedGeneralCost)
    ),
  };

  return {
    month: input.month,
    projects,
    rows,
    totals,
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
  totals: ProjectCostTotals
): ProjectCostReportSummary => ({
  totalPersonnelCost: sumNumbers(totals.projects.map((project) => project.baseCost)),
  totalGeneralCosts: sumNumbers(
    totals.projects.map((project) => project.allocatedGeneralCost)
  ),
  totalFinalCost: totals.totalFinal,
  activeProjects: getProjectIdsWithCost(totals.projects).length,
});

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

    return {
      ...row,
      projects: projectCells,
      total: sumNumbers(projectCells.map((project) => project.baseCost)),
    };
  });

  const projectTotals = visibleProjects.map((project) => ({
    ...buildEmptyCell(),
    projectId: project.projectId,
    projectName: project.projectName,
  }));

  for (const row of visibleRows) {
    for (let index = 0; index < row.projects.length; index++) {
      const projectCell = row.projects[index];
      projectTotals[index].baseCost += row.isGeneralCostsDepartment ? 0 : projectCell.baseCost;
      if (row.isGeneralCostsDepartment) {
        projectTotals[index].allocatedGeneralCost += projectCell.baseCost;
      }
      projectTotals[index].details.push(...projectCell.details);
      for (const warning of projectCell.warnings) {
        addWarning(projectTotals[index], warning);
      }
    }
  }

  const totals: ProjectCostTotals = {
    projects: projectTotals,
    totalBase: sumNumbers(projectTotals.map((project) => project.baseCost)),
    totalFinal: sumNumbers(
      projectTotals.map((project) => project.baseCost + project.allocatedGeneralCost)
    ),
  };

  return {
    month: report.month,
    projects: visibleProjects.map((project) => ({ ...project })),
    rows: visibleRows,
    totals,
    summary: buildProjectCostReportSummary(totals),
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
          const cell = view.totals.projects.find((project) => project.projectId === projectId);
          return {
            month: view.month,
            cost: (cell?.baseCost ?? 0) + (cell?.allocatedGeneralCost ?? 0),
          };
        }),
      };
    })
    .sort((left, right) => left.projectName.localeCompare(right.projectName, "es"));
};
