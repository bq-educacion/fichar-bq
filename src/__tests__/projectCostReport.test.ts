import {
  COMPANY_COST_MULTIPLIER,
  buildProjectCostReport,
  computeMonthlyCompanyCost,
  resolveSalaryForMonthEnd,
} from "@/lib/projectCostReport";

const monthEnd = new Date(2026, 2, 31, 23, 59, 59, 999);

describe("project cost report calculations", () => {
  it("resolves the salary active at the end of the month", () => {
    const resolved = resolveSalaryForMonthEnd(
      [
        { startDate: new Date("2026-01-01T00:00:00.000Z"), grossSalary: 28000 },
        { startDate: new Date("2026-03-10T00:00:00.000Z"), grossSalary: 32000 },
        { startDate: new Date("2026-03-25T00:00:00.000Z"), grossSalary: 34000 },
        { startDate: new Date("2026-04-01T00:00:00.000Z"), grossSalary: 36000 },
      ],
      monthEnd
    );

    expect(resolved).toEqual({
      startDate: new Date("2026-03-25T00:00:00.000Z"),
      grossSalary: 34000,
    });
  });

  it("computes monthly company cost with the fixed 1.30 multiplier", () => {
    const grossSalary = 30000;

    expect(COMPANY_COST_MULTIPLIER).toBe(1.3);
    expect(computeMonthlyCompanyCost(grossSalary)).toBeCloseTo(3250, 6);
  });

  it("allocates user monthly company cost across projects", () => {
    const report = buildProjectCostReport(
      {
        month: "2026-03",
        departments: [
          {
            departmentId: "dep-sales",
            departmentName: "Ventas",
            isGeneralCostsDepartment: false,
          },
        ],
        projects: [
          { projectId: "project-a", projectName: "Proyecto A" },
          { projectId: "project-b", projectName: "Proyecto B" },
        ],
        users: [
          {
            userId: "user-1",
            userName: "Ana",
            departmentId: "dep-sales",
            departmentName: "Ventas",
            isGeneralCostsDepartment: false,
            salaryHistory: [
              { startDate: new Date("2026-01-01T00:00:00.000Z"), grossSalary: 36000 },
            ],
            allocations: [
              { projectId: "project-a", projectName: "Proyecto A", percentage: 60 },
              { projectId: "project-b", projectName: "Proyecto B", percentage: 40 },
            ],
            allocationSourceDate: new Date("2026-03-20T00:00:00.000Z"),
          },
        ],
        monthlyGeneralCost: 0,
      },
      monthEnd
    );

    const row = report.rows.find((item) => item.departmentId === "dep-sales");
    const totalA = report.totals.projects.find((project) => project.projectId === "project-a");
    const totalB = report.totals.projects.find((project) => project.projectId === "project-b");

    expect(row).toBeDefined();
    expect(row?.generalCosts.baseCost).toBeCloseTo(0, 6);
    expect(row?.projects.find((project) => project.projectId === "project-a")?.baseCost).toBeCloseTo(
      2340,
      6
    );
    expect(row?.projects.find((project) => project.projectId === "project-b")?.baseCost).toBeCloseTo(
      1560,
      6
    );
    expect(totalA?.baseCost).toBeCloseTo(2340, 6);
    expect(totalB?.baseCost).toBeCloseTo(1560, 6);
    expect(report.totals.totalBase).toBeCloseTo(3900, 6);
  });

  it("distributes general costs proportionally by project personnel weight", () => {
    const report = buildProjectCostReport(
      {
        month: "2026-03",
        departments: [
          {
            departmentId: "dep-sales",
            departmentName: "Ventas",
            isGeneralCostsDepartment: false,
          },
          {
            departmentId: "dep-admin",
            departmentName: "Administración",
            isGeneralCostsDepartment: true,
          },
        ],
        projects: [
          { projectId: "project-a", projectName: "Proyecto A" },
          { projectId: "project-b", projectName: "Proyecto B" },
        ],
        users: [
          {
            userId: "user-1",
            userName: "Ana",
            departmentId: "dep-sales",
            departmentName: "Ventas",
            isGeneralCostsDepartment: false,
            salaryHistory: [
              { startDate: new Date("2026-01-01T00:00:00.000Z"), grossSalary: 36000 },
            ],
            allocations: [
              { projectId: "project-a", projectName: "Proyecto A", percentage: 60 },
              { projectId: "project-b", projectName: "Proyecto B", percentage: 40 },
            ],
            allocationSourceDate: new Date("2026-03-20T00:00:00.000Z"),
          },
          {
            userId: "user-2",
            userName: "Luis",
            departmentId: "dep-admin",
            departmentName: "Administración",
            isGeneralCostsDepartment: true,
            salaryHistory: [
              { startDate: new Date("2026-01-01T00:00:00.000Z"), grossSalary: 24000 },
            ],
            allocations: [],
            allocationSourceDate: null,
          },
        ],
        monthlyGeneralCost: 1400,
      },
      monthEnd
    );

    const projectA = report.generalCostAllocation.find((project) => project.projectId === "project-a");
    const projectB = report.generalCostAllocation.find((project) => project.projectId === "project-b");

    expect(report.totals.generalCosts.baseCost).toBeCloseTo(4000, 6);
    expect(projectA?.weight).toBeCloseTo(0.6, 6);
    expect(projectB?.weight).toBeCloseTo(0.4, 6);
    expect(projectA?.allocatedGeneralCost).toBeCloseTo(2400, 6);
    expect(projectB?.allocatedGeneralCost).toBeCloseTo(1600, 6);
    expect(projectA?.finalCost).toBeCloseTo(4740, 6);
    expect(projectB?.finalCost).toBeCloseTo(3160, 6);
    expect(report.totals.totalFinal).toBeCloseTo(7900, 6);
  });

  it("keeps incomplete allocations visible as unassigned general cost", () => {
    const report = buildProjectCostReport(
      {
        month: "2026-03",
        departments: [
          {
            departmentId: "dep-sales",
            departmentName: "Ventas",
            isGeneralCostsDepartment: false,
          },
        ],
        projects: [{ projectId: "project-a", projectName: "Proyecto A" }],
        users: [
          {
            userId: "user-1",
            userName: "Ana",
            departmentId: "dep-sales",
            departmentName: "Ventas",
            isGeneralCostsDepartment: false,
            salaryHistory: [
              { startDate: new Date("2026-01-01T00:00:00.000Z"), grossSalary: 12000 },
            ],
            allocations: [{ projectId: "project-a", projectName: "Proyecto A", percentage: 80 }],
            allocationSourceDate: new Date("2026-03-05T00:00:00.000Z"),
          },
        ],
        monthlyGeneralCost: 0,
      },
      monthEnd
    );

    const row = report.rows.find((item) => item.departmentId === "dep-sales");

    expect(row?.generalCosts.baseCost).toBeCloseTo(260, 6);
    expect(row?.generalCosts.warnings).toContain("Asignaciones incompletas (80%)");
    expect(row?.projects[0].baseCost).toBeCloseTo(1040, 6);
  });

  it("flags allocations above 100% without normalizing them", () => {
    const report = buildProjectCostReport(
      {
        month: "2026-03",
        departments: [
          {
            departmentId: "dep-sales",
            departmentName: "Ventas",
            isGeneralCostsDepartment: false,
          },
        ],
        projects: [
          { projectId: "project-a", projectName: "Proyecto A" },
          { projectId: "project-b", projectName: "Proyecto B" },
        ],
        users: [
          {
            userId: "user-1",
            userName: "Ana",
            departmentId: "dep-sales",
            departmentName: "Ventas",
            isGeneralCostsDepartment: false,
            salaryHistory: [
              { startDate: new Date("2026-01-01T00:00:00.000Z"), grossSalary: 12000 },
            ],
            allocations: [
              { projectId: "project-a", projectName: "Proyecto A", percentage: 70 },
              { projectId: "project-b", projectName: "Proyecto B", percentage: 50 },
            ],
            allocationSourceDate: new Date("2026-03-05T00:00:00.000Z"),
          },
        ],
        monthlyGeneralCost: 0,
      },
      monthEnd
    );

    const row = report.rows.find((item) => item.departmentId === "dep-sales");

    expect(row?.generalCosts.baseCost).toBeCloseTo(0, 6);
    expect(row?.projects.find((project) => project.projectId === "project-a")?.baseCost).toBeCloseTo(
      910,
      6
    );
    expect(row?.projects.find((project) => project.projectId === "project-b")?.baseCost).toBeCloseTo(
      650,
      6
    );
    expect(row?.projects[0].warnings).toContain("Asignaciones superiores al 100% (120%)");
    expect(report.totals.totalBase).toBeCloseTo(1560, 6);
  });
});
