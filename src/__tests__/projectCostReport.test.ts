import {
  COMPANY_COST_MULTIPLIER,
  buildProjectCostReport,
  computeAverageMonthlyAllocations,
  computeMonthlyCompanyCost,
  filterProjectCostReport,
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

  it("computes the average project dedication for the month", () => {
    const allocations = computeAverageMonthlyAllocations(
      [
        {
          dedications: [
            { projectId: "project-a", dedication: 60 },
            { projectId: "project-b", dedication: 40 },
          ],
        },
        {
          dedications: [
            { projectId: "project-a", dedication: 20 },
            { projectId: "project-b", dedication: 80 },
          ],
        },
      ],
      [
        { projectId: "project-a", projectName: "Proyecto A" },
        { projectId: "project-b", projectName: "Proyecto B" },
      ]
    );

    expect(allocations).toEqual([
      { projectId: "project-a", projectName: "Proyecto A", percentage: 40 },
      { projectId: "project-b", projectName: "Proyecto B", percentage: 60 },
    ]);
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
      },
      monthEnd
    );

    const row = report.rows.find((item) => item.departmentId === "dep-sales");
    const totalA = report.totals.projects.find((project) => project.projectId === "project-a");
    const totalB = report.totals.projects.find((project) => project.projectId === "project-b");

    expect(row).toBeDefined();
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

  it("distributes indirect department costs proportionally by direct project weight", () => {
    // Ana: 36000 salary -> 3900/mo company cost, 60% A + 40% B
    // Luis: 24000 salary -> 2600/mo company cost, in indirect dept
    // Direct: A=2340, B=1560, total=3900
    // Weight A = 2340/3900 = 0.6, Weight B = 1560/3900 = 0.4
    // Indirect distributed: A = 2600*0.6 = 1560, B = 2600*0.4 = 1040
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
      },
      monthEnd
    );

    const adminRow = report.rows.find((item) => item.departmentId === "dep-admin");
    const adminA = adminRow?.projects.find((p) => p.projectId === "project-a");
    const adminB = adminRow?.projects.find((p) => p.projectId === "project-b");

    expect(adminA?.baseCost).toBeCloseTo(1560, 6);
    expect(adminB?.baseCost).toBeCloseTo(1040, 6);
    expect(adminRow?.totalBase).toBeCloseTo(2600, 6);

    const totalA = report.totals.projects.find((p) => p.projectId === "project-a");
    const totalB = report.totals.projects.find((p) => p.projectId === "project-b");

    expect(totalA?.baseCost).toBeCloseTo(2340, 6);
    expect(totalA?.allocatedGeneralCost).toBeCloseTo(1560, 6);
    expect(totalA?.finalCost).toBeCloseTo(3900, 6);
    expect(totalB?.baseCost).toBeCloseTo(1560, 6);
    expect(totalB?.allocatedGeneralCost).toBeCloseTo(1040, 6);
    expect(totalB?.finalCost).toBeCloseTo(2600, 6);
    expect(report.totals.totalFinal).toBeCloseTo(6500, 6);
  });

  it("keeps incomplete allocations visible as unassigned general cost in pool", () => {
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
      },
      monthEnd
    );

    const row = report.rows.find((item) => item.departmentId === "dep-sales");

    // 80% of 1300 = 1040 assigned to project-a
    expect(row?.projects[0].baseCost).toBeCloseTo(1040, 6);
    expect(row?.projects[0].warnings).toContain("Asignaciones incompletas (80%)");
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
      },
      monthEnd
    );

    const row = report.rows.find((item) => item.departmentId === "dep-sales");

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

  it("distributes zero to indirect departments when there are no direct costs", () => {
    const report = buildProjectCostReport(
      {
        month: "2026-03",
        departments: [
          {
            departmentId: "dep-admin",
            departmentName: "Administración",
            isGeneralCostsDepartment: true,
          },
        ],
        projects: [{ projectId: "project-a", projectName: "Proyecto A" }],
        users: [
          {
            userId: "user-1",
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
      },
      monthEnd
    );

    const adminRow = report.rows.find((item) => item.departmentId === "dep-admin");
    expect(adminRow?.projects[0].baseCost).toBeCloseTo(0, 6);
    expect(adminRow?.totalBase).toBeCloseTo(0, 6);
    expect(report.totals.totalFinal).toBeCloseTo(0, 6);
  });

  it("consistency: indirect department distributed sum equals its pool total", () => {
    const report = buildProjectCostReport(
      {
        month: "2026-03",
        departments: [
          {
            departmentId: "dep-eng",
            departmentName: "Ingeniería",
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
          { projectId: "project-c", projectName: "Proyecto C" },
        ],
        users: [
          {
            userId: "user-1",
            userName: "Ana",
            departmentId: "dep-eng",
            departmentName: "Ingeniería",
            isGeneralCostsDepartment: false,
            salaryHistory: [
              { startDate: new Date("2026-01-01T00:00:00.000Z"), grossSalary: 36000 },
            ],
            allocations: [
              { projectId: "project-a", projectName: "Proyecto A", percentage: 50 },
              { projectId: "project-b", projectName: "Proyecto B", percentage: 30 },
              { projectId: "project-c", projectName: "Proyecto C", percentage: 20 },
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
              { startDate: new Date("2026-01-01T00:00:00.000Z"), grossSalary: 30000 },
            ],
            allocations: [],
            allocationSourceDate: null,
          },
        ],
      },
      monthEnd
    );

    const adminRow = report.rows.find((item) => item.departmentId === "dep-admin");
    const distributedSum = adminRow!.projects.reduce((acc, p) => acc + p.baseCost, 0);
    // Luis company cost = 30000 * 1.3 / 12 = 3250
    expect(distributedSum).toBeCloseTo(3250, 4);
  });

  it("filterProjectCostReport filters by department and recalculates totals", () => {
    const report = buildProjectCostReport(
      {
        month: "2026-03",
        departments: [
          { departmentId: "dep-a", departmentName: "Dept A", isGeneralCostsDepartment: false },
          { departmentId: "dep-b", departmentName: "Dept B", isGeneralCostsDepartment: false },
        ],
        projects: [{ projectId: "project-a", projectName: "Proyecto A" }],
        users: [
          {
            userId: "user-1",
            userName: "Ana",
            departmentId: "dep-a",
            departmentName: "Dept A",
            isGeneralCostsDepartment: false,
            salaryHistory: [
              { startDate: new Date("2026-01-01T00:00:00.000Z"), grossSalary: 24000 },
            ],
            allocations: [{ projectId: "project-a", projectName: "Proyecto A", percentage: 100 }],
            allocationSourceDate: new Date("2026-03-20T00:00:00.000Z"),
          },
          {
            userId: "user-2",
            userName: "Luis",
            departmentId: "dep-b",
            departmentName: "Dept B",
            isGeneralCostsDepartment: false,
            salaryHistory: [
              { startDate: new Date("2026-01-01T00:00:00.000Z"), grossSalary: 36000 },
            ],
            allocations: [{ projectId: "project-a", projectName: "Proyecto A", percentage: 100 }],
            allocationSourceDate: new Date("2026-03-20T00:00:00.000Z"),
          },
        ],
      },
      monthEnd
    );

    const view = filterProjectCostReport(report, {
      departmentId: "dep-a",
      projectId: null,
    });

    expect(view.rows).toHaveLength(1);
    expect(view.rows[0].departmentId).toBe("dep-a");
    // Ana: 24000 * 1.3 / 12 = 2600 (direct only, no indirect depts in filtered view)
    expect(view.totals.totalBase).toBeCloseTo(2600, 6);
    expect(view.totals.totalFinal).toBeCloseTo(2600, 6);
  });
});
