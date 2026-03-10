import {
  buildDefaultProjectDedications,
  ProjectDedicationOption,
} from "@/lib/projectDedications";

describe("buildDefaultProjectDedications", () => {
  const projectA: ProjectDedicationOption = {
    _id: "507f191e810c19729de860aa",
    name: "Project A",
  };
  const projectB: ProjectDedicationOption = {
    _id: "507f191e810c19729de860ab",
    name: "Project B",
  };
  const projectC: ProjectDedicationOption = {
    _id: "507f191e810c19729de860ac",
    name: "Project C",
  };

  it("returns empty array when no projects exist", () => {
    expect(buildDefaultProjectDedications([], [])).toEqual([]);
  });

  it("reuses complete existing dedications and keeps project order", () => {
    const result = buildDefaultProjectDedications(
      [projectB, projectA],
      [
        { projectId: projectA._id, dedication: 70 },
        { projectId: projectB._id, dedication: 30 },
      ]
    );

    expect(result).toEqual([
      { projectId: projectB._id, dedication: 30 },
      { projectId: projectA._id, dedication: 70 },
    ]);
  });

  it("builds an even 10%-based distribution for 3 projects", () => {
    const result = buildDefaultProjectDedications(
      [projectA, projectB, projectC],
      []
    );

    expect(result).toEqual([
      { projectId: projectA._id, dedication: 40 },
      { projectId: projectB._id, dedication: 30 },
      { projectId: projectC._id, dedication: 30 },
    ]);
  });

  it("falls back to default distribution when existing sum is not 100", () => {
    const result = buildDefaultProjectDedications(
      [projectA, projectB],
      [
        { projectId: projectA._id, dedication: 30 },
        { projectId: projectB._id, dedication: 30 },
      ]
    );

    expect(result).toEqual([
      { projectId: projectA._id, dedication: 50 },
      { projectId: projectB._id, dedication: 50 },
    ]);
  });

  it("falls back to default distribution when a project is missing in existing values", () => {
    const result = buildDefaultProjectDedications(
      [projectA, projectB, projectC],
      [
        { projectId: projectA._id, dedication: 50 },
        { projectId: projectB._id, dedication: 50 },
      ]
    );

    expect(result).toEqual([
      { projectId: projectA._id, dedication: 40 },
      { projectId: projectB._id, dedication: 30 },
      { projectId: projectC._id, dedication: 30 },
    ]);
  });

  it("always returns percentages summing exactly to 100 and in 10% increments", () => {
    const projects: ProjectDedicationOption[] = Array.from(
      { length: 6 },
      (_, index) => ({
        _id: `507f191e810c19729de860b${index}`,
        name: `P${index}`,
      })
    );

    const result = buildDefaultProjectDedications(projects, []);
    const total = result.reduce((acc, item) => acc + item.dedication, 0);

    expect(result.map((item) => item.dedication)).toEqual([20, 20, 20, 20, 10, 10]);
    expect(total).toBe(100);
    expect(result.every((item) => item.dedication % 10 === 0)).toBe(true);
  });
});
