import {
  DepartmentModel,
  ProjectDedicationModel,
  ProjectModel,
  UserModel,
} from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import {
  buildProjectCostChartSeries,
  buildProjectCostReport,
  computeAverageMonthlyAllocations,
  filterProjectCostReport,
  NO_DEPARTMENT_ROW_ID,
  type ProjectCostAllocationInput,
  type ProjectCostMonthlyDedicationRecord,
  type ProjectCostDetailItem,
  type ProjectCostProjectCell,
  type ProjectCostProjectInput,
  type ProjectCostReport,
  type ProjectCostReportInput,
  type ProjectCostReportView,
  type ProjectCostRow,
} from "@/lib/projectCostReport";
import { getSalaryHistoryFromUser } from "@/lib/userSalary";
import {
  type AdminProjectCostReportQuery,
  type AdminProjectCostReportResponse,
  adminProjectCostReportResponseSchema,
} from "@/schemas/projectCosts";
import { parseWithSchema } from "@/lib/validation";
import mongoose from "mongoose";

const DEVELOPER_NOTE = [
  "Coste empresa mensual = (salario bruto anual x 1.30) / 12.",
  "El multiplicador 1.30 representa el coste empresarial fijo usado en el informe.",
  "El salario aplicado es el vigente al cierre del mes: la última entrada con fecha <= fin de mes.",
  "La asignación mensual a proyecto se calcula como la media de las dedicaciones registradas dentro del mes; si solo hay un proyecto activo, se asume 100%.",
  "Los gastos generales se reparten por proyecto proporcionalmente al coste directo de cada proyecto.",
];

type MonthBounds = {
  monthKey: string;
  start: Date;
  end: Date;
};

type ProjectDoc = {
  _id: { toString(): string };
  name?: string;
  user?: Array<{ toString(): string }>;
  startDate?: Date;
  endData?: Date;
};

type UserDoc = {
  _id: { toString(): string };
  email: string;
  name?: string;
  active?: boolean;
  department?: { toString(): string } | null;
  salaryHistory?: Array<{
    initDate?: unknown;
    valueEncrypted?: unknown;
    get?: (path: string) => unknown;
  }>;
  get?: (path: string) => unknown;
};

type DepartmentDoc = {
  _id: { toString(): string };
  name?: string;
  costesGenerales?: boolean;
};

const buildMonthBounds = (monthKey: string): MonthBounds => {
  const [rawYear, rawMonth] = monthKey.split("-");
  const year = Number(rawYear);
  const monthIndex = Number(rawMonth) - 1;
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  return {
    monthKey,
    start,
    end,
  };
};

const toMonthKey = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
};

const buildMonthKeys = (targetMonth: string, count: number): string[] => {
  const { start } = buildMonthBounds(targetMonth);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() - (count - index - 1), 1);
    return toMonthKey(date);
  });
};

const getDisplayName = (user: Pick<UserDoc, "name" | "email">): string =>
  user.name?.trim() || user.email;

const getMonthlyDedicationsByUser = async (
  userIds: string[],
  month: MonthBounds
): Promise<Map<string, ProjectCostMonthlyDedicationRecord[]>> => {
  if (userIds.length === 0) {
    return new Map();
  }

  const docs = await ProjectDedicationModel.find({
    userId: {
      $in: userIds.map((userId) => new mongoose.Types.ObjectId(userId)),
    },
    date: {
      $gte: month.start,
      $lte: month.end,
    },
  })
    .select("userId dedications")
    .exec();

  const recordsByUser = new Map<string, ProjectCostMonthlyDedicationRecord[]>();

  for (const doc of docs) {
    const userId = doc.userId?.toString?.();
    if (!userId) {
      continue;
    }

    const dedications = Array.isArray(doc.dedications)
      ? (doc.dedications as Array<{ projectId?: { toString(): string }; dedication?: unknown }>)
          .map((dedication) => ({
            projectId: dedication?.projectId?.toString?.() ?? "",
            dedication: Number(dedication?.dedication),
          }))
          .filter(
            (dedication) =>
              dedication.projectId.length > 0 && Number.isFinite(dedication.dedication)
          )
      : [];

    const current = recordsByUser.get(userId) ?? [];
    current.push({
      dedications,
    });
    recordsByUser.set(userId, current);
  }

  return recordsByUser;
};

const stripSalaryFromDetail = (detail: ProjectCostDetailItem) => ({
  kind: detail.kind,
  label: detail.label,
  userId: detail.userId,
  userName: detail.userName,
  departmentId: detail.departmentId,
  departmentName: detail.departmentName,
  projectId: detail.projectId,
  projectName: detail.projectName,
  allocationPercentage: detail.allocationPercentage,
  assignedMonthlyCost: detail.assignedMonthlyCost,
  warning: detail.warning,
});

const serializeProjectCell = (cell: ProjectCostProjectCell) => ({
  projectId: cell.projectId,
  projectName: cell.projectName,
  baseCost: cell.baseCost,
  allocatedGeneralCost: cell.allocatedGeneralCost,
  details: cell.details.map(stripSalaryFromDetail),
  warnings: [...cell.warnings],
});

const serializeRow = (row: ProjectCostRow) => ({
  departmentId: row.departmentId,
  departmentName: row.departmentName,
  isGeneralCostsDepartment: row.isGeneralCostsDepartment,
  isSynthetic: row.isSynthetic,
  projects: row.projects.map(serializeProjectCell),
  total: row.total,
});

const serializeReportView = (
  month: string,
  view: ProjectCostReportView,
  departmentOptions: Array<{ id: string; label: string }>,
  projectOptions: Array<{ id: string; label: string }>,
  selectedDepartmentId: string | null,
  selectedProjectId: string | null,
  chart: AdminProjectCostReportResponse["chart"]
): AdminProjectCostReportResponse =>
  parseWithSchema(adminProjectCostReportResponseSchema, {
    month,
    filters: {
      selectedDepartmentId,
      selectedProjectId,
      departments: departmentOptions,
      projects: projectOptions,
    },
    rows: view.rows.map(serializeRow),
    projects: view.projects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
    })),
    totals: {
      projects: view.totals.projects.map(serializeProjectCell),
      totalBase: view.totals.totalBase,
      totalFinal: view.totals.totalFinal,
    },
    summary: view.summary,
    chart,
    developerNote: DEVELOPER_NOTE,
  });

const buildDepartmentOptions = (report: ProjectCostReport): Array<{ id: string; label: string }> =>
  report.rows
    .map((row) => ({
      id: row.departmentId,
      label: row.departmentName,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "es"));

const buildProjectOptions = (report: ProjectCostReport): Array<{ id: string; label: string }> =>
  report.projects
    .map((project) => ({
      id: project.projectId,
      label: project.projectName,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "es"));

const buildReportForMonth = async ({
  month,
  departments,
  projects,
  users,
}: {
  month: MonthBounds;
  departments: DepartmentDoc[];
  projects: ProjectDoc[];
  users: UserDoc[];
}): Promise<ProjectCostReport> => {
  const departmentInfo = new Map(
    departments.map((department) => [
      department._id.toString(),
      {
        departmentId: department._id.toString(),
        departmentName: department.name?.trim() || department._id.toString(),
        isGeneralCostsDepartment: Boolean(department.costesGenerales),
      },
    ])
  );

  const activeProjects = projects
    .filter((project) => {
      const startDate =
        project.startDate instanceof Date ? project.startDate : new Date(project.startDate ?? "");
      const endDate =
        project.endData instanceof Date ? project.endData : new Date(project.endData ?? "");
      return (
        !Number.isNaN(startDate.getTime()) &&
        !Number.isNaN(endDate.getTime()) &&
        startDate.getTime() <= month.end.getTime() &&
        endDate.getTime() >= month.start.getTime()
      );
    })
    .map((project) => ({
      projectId: project._id.toString(),
      projectName: project.name?.trim() || project._id.toString(),
      users: Array.isArray(project.user) ? project.user.map((user) => user.toString()) : [],
    }))
    .sort((left, right) => left.projectName.localeCompare(right.projectName, "es"));

  const userIds = users.map((user) => user._id.toString());
  const monthlyDedicationsByUser = await getMonthlyDedicationsByUser(userIds, month);

  const activeProjectsByUser = new Map<string, ProjectCostProjectInput[]>();
  for (const project of activeProjects) {
    for (const userId of project.users) {
      const current = activeProjectsByUser.get(userId) ?? [];
      current.push({
        projectId: project.projectId,
        projectName: project.projectName,
      });
      activeProjectsByUser.set(userId, current);
    }
  }

  const eligibleUsers = users.filter((user) => {
    if (user.active === false) {
      return false;
    }
    const departmentId = user.department?.toString() ?? NO_DEPARTMENT_ROW_ID;
    const department = departmentInfo.get(departmentId);
    if (department?.isGeneralCostsDepartment) {
      return true;
    }
    return monthlyDedicationsByUser.has(user._id.toString());
  });

  const reportInput: ProjectCostReportInput = {
    month: month.monthKey,
    departments: Array.from(departmentInfo.values()).sort((left, right) =>
      left.departmentName.localeCompare(right.departmentName, "es")
    ),
    projects: activeProjects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
    })),
    users: eligibleUsers.map((user) => {
      const departmentId = user.department?.toString() ?? NO_DEPARTMENT_ROW_ID;
      const department =
        departmentInfo.get(departmentId) ??
        ({
          departmentId: NO_DEPARTMENT_ROW_ID,
          departmentName: "Sin departamento",
          isGeneralCostsDepartment: false,
        } as const);
      const assignedProjects = activeProjectsByUser.get(user._id.toString()) ?? [];
      const monthlyDedications = monthlyDedicationsByUser.get(user._id.toString()) ?? [];
      const averagedAllocations = computeAverageMonthlyAllocations(
        monthlyDedications,
        assignedProjects
      );
      const resolvedAllocations: ProjectCostAllocationInput[] =
        averagedAllocations.length === 0 && assignedProjects.length === 1
          ? [
              {
                projectId: assignedProjects[0].projectId,
                projectName: assignedProjects[0].projectName,
                percentage: 100,
              },
            ]
          : averagedAllocations;

      return {
        userId: user._id.toString(),
        userName: getDisplayName(user),
        departmentId: department.departmentId,
        departmentName: department.departmentName,
        isGeneralCostsDepartment: department.isGeneralCostsDepartment,
        salaryHistory: getSalaryHistoryFromUser(user).map((entry) => ({
          startDate: entry.initDate,
          grossSalary: entry.salary,
        })),
        allocations: resolvedAllocations,
        allocationSourceDate:
          resolvedAllocations.length > 0 || assignedProjects.length === 1
              ? month.end
              : null,
      };
    }),
  };

  return buildProjectCostReport(reportInput, month.end);
};

const buildChart = (views: ProjectCostReportView[]) =>
  buildProjectCostChartSeries(views).map((series) => ({
    projectId: series.projectId,
    projectName: series.projectName,
    points: series.points.map((point) => ({
      month: point.month,
      cost: point.cost,
    })),
  }));

export const getAdminProjectCostReport = async (
  query: AdminProjectCostReportQuery
): Promise<AdminProjectCostReportResponse> => {
  await connectMongo();

  const selectedMonth = buildMonthBounds(query.month);
  const historyMonthKeys = buildMonthKeys(query.month, 6);
  const earliestMonth = buildMonthBounds(historyMonthKeys[0]);

  const [departments, projects, users] = await Promise.all([
    DepartmentModel.find({}).collation({ locale: "es" }).sort({ name: 1 }).exec(),
    ProjectModel.find({
      startDate: { $lte: selectedMonth.end },
      endData: { $gte: earliestMonth.start },
    })
      .collation({ locale: "es" })
      .sort({ name: 1 })
      .select("_id name user startDate endData")
      .exec(),
    UserModel.find({})
      .collation({ locale: "es" })
      .sort({ name: 1, email: 1 })
      .select("_id email name active department +salaryHistory")
      .exec(),
  ]);

  const months = historyMonthKeys.map((monthKey) => buildMonthBounds(monthKey));
  const reports = await Promise.all(
    months.map((month) =>
      buildReportForMonth({
        month,
        departments,
        projects,
        users,
      })
    )
  );

  const selectedReport = reports[reports.length - 1];
  const selectedView = filterProjectCostReport(selectedReport, {
    departmentId: query.departmentId ?? null,
    projectId: query.projectId ?? null,
  });
  const historyViews = reports.map((report) =>
    filterProjectCostReport(report, {
      departmentId: query.departmentId ?? null,
      projectId: query.projectId ?? null,
    })
  );

  return serializeReportView(
    query.month,
    selectedView,
    buildDepartmentOptions(selectedReport),
    buildProjectOptions(selectedReport),
    query.departmentId ?? null,
    query.projectId ?? null,
    buildChart(historyViews)
  );
};
