type BuildAdminUsersRequestPathOptions = {
  showAll: boolean;
  showSalaries: boolean;
  isSuperadmin: boolean;
};

const toInputDateString = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const canUseSalaryVisibilityToggle = (isSuperadmin: boolean): boolean =>
  isSuperadmin;

export const getSalaryToggleLabel = (showSalaries: boolean): string =>
  showSalaries ? "Ocultar salarios" : "Mostrar salarios";

export const buildAdminUsersRequestPath = ({
  showAll,
  showSalaries,
  isSuperadmin,
}: BuildAdminUsersRequestPathOptions): string => {
  const query = new URLSearchParams({ detailed: "true" });

  if (showAll) {
    query.set("includeInactive", "true");
  }

  if (isSuperadmin && showSalaries) {
    query.set("includeSalary", "true");
  }

  return `/api/admin/users?${query.toString()}`;
};

export const parseSalaryInput = (value: string): number | undefined => {
  const normalizedValue = value.trim().replace(",", ".");
  if (!normalizedValue) {
    return undefined;
  }

  const salary = Number(normalizedValue);
  if (!Number.isFinite(salary) || salary < 0) {
    return undefined;
  }

  return salary;
};

export const formatSalaryForInput = (
  salary: number | null | undefined
): string => {
  if (typeof salary !== "number") {
    return "";
  }

  return String(salary);
};

export const formatSalaryForDisplay = (
  salary: number | null | undefined
): string => {
  if (typeof salary !== "number") {
    return "Sin definir";
  }

  return String(salary);
};

export const formatDateForInput = (
  value: Date | string | null | undefined
): string => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return toInputDateString(value);
};

export const getTodayDateForInput = (): string =>
  toInputDateString(new Date());
