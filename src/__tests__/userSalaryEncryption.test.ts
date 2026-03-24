import { UserModel } from "@/db/Models";
import {
  appendSalaryToUserHistory,
  getCurrentSalaryEntryFromUser,
} from "@/lib/userSalary";

describe("user salary encryption", () => {
  const originalSalaryKey = process.env.USER_SALARY_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.USER_SALARY_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterAll(() => {
    process.env.USER_SALARY_ENCRYPTION_KEY = originalSalaryKey;
  });

  it("stores salary history encrypted in the model and keeps it out of default serialization", () => {
    const user = new UserModel({
      email: "worker@example.com",
      name: "Worker",
    });

    appendSalaryToUserHistory(user as never, 24500.5, new Date("2026-03-24"));

    const salaryHistory = user.get("salaryHistory");

    expect(Array.isArray(salaryHistory)).toBe(true);
    expect(salaryHistory).toHaveLength(1);
    expect(salaryHistory[0].valueEncrypted).not.toContain("24500.5");
    expect(getCurrentSalaryEntryFromUser(user as never)).toEqual({
      salary: 24500.5,
      initDate: new Date("2026-03-24T00:00:00.000Z"),
    });

    const serializedUser = JSON.parse(JSON.stringify(user));
    expect(serializedUser.salaryHistory).toBeUndefined();
    expect(serializedUser.salary).toBeUndefined();
  });
});
