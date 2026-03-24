import {
  buildAdminUsersRequestPath,
  canUseSalaryVisibilityToggle,
  formatDateForInput,
  getSalaryToggleLabel,
  parseSalaryInput,
} from "@/lib/adminUsers";

describe("admin users ui helpers", () => {
  it("keeps salary hidden by default in the users list request", () => {
    expect(
      buildAdminUsersRequestPath({
        showAll: false,
        showSalaries: false,
        isSuperadmin: true,
      })
    ).toBe("/api/admin/users?detailed=true");
  });

  it("only adds salary visibility to the request when a superadmin enables it", () => {
    expect(
      buildAdminUsersRequestPath({
        showAll: false,
        showSalaries: true,
        isSuperadmin: true,
      })
    ).toBe("/api/admin/users?detailed=true&includeSalary=true");

    expect(
      buildAdminUsersRequestPath({
        showAll: false,
        showSalaries: true,
        isSuperadmin: false,
      })
    ).toBe("/api/admin/users?detailed=true");
  });

  it("shows the salary toggle only for superadmins", () => {
    expect(canUseSalaryVisibilityToggle(true)).toBe(true);
    expect(canUseSalaryVisibilityToggle(false)).toBe(false);
  });

  it("switches the salary toggle label between show and hide", () => {
    expect(getSalaryToggleLabel(false)).toBe("Mostrar salarios");
    expect(getSalaryToggleLabel(true)).toBe("Ocultar salarios");
  });

  it("parses decimal salary input correctly for the editor", () => {
    expect(parseSalaryInput("24500.50")).toBe(24500.5);
    expect(parseSalaryInput("24500,50")).toBe(24500.5);
    expect(parseSalaryInput("")).toBeUndefined();
    expect(parseSalaryInput("-10")).toBeUndefined();
  });

  it("formats salary dates for the date input", () => {
    expect(formatDateForInput(new Date("2026-03-24T12:00:00.000Z"))).toBe(
      "2026-03-24"
    );
    expect(formatDateForInput("2026-03-25T00:00:00.000Z")).toBe("2026-03-25");
  });
});
