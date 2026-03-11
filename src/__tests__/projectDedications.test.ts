import {
  ProjectDedicationInput,
} from "@/schemas/api";
import { resolveDedicationsForProjects } from "@/controllers/projectDedications";

const projectA = { _id: "111111111111111111111111", name: "Proyecto A" };
const projectB = { _id: "222222222222222222222222", name: "Proyecto B" };

describe("resolveDedicationsForProjects", () => {
  it("returns empty dedications when there are no assigned projects and no input", () => {
    expect(resolveDedicationsForProjects([], [])).toEqual([]);
  });

  it("rejects dedications when there are no assigned projects", () => {
    const dedications: ProjectDedicationInput[] = [
      { projectId: projectA._id, dedication: 100 },
    ];

    expect(() => resolveDedicationsForProjects(dedications, [])).toThrow(
      "No tienes proyectos activos asignados hoy"
    );
  });

  it("auto-assigns 100% when exactly one project is assigned", () => {
    expect(resolveDedicationsForProjects([], [projectA])).toEqual([
      { projectId: projectA._id, dedication: 100 },
    ]);
  });

  it("ignores provided values and keeps 100% for single assigned project", () => {
    const dedications: ProjectDedicationInput[] = [
      { projectId: projectB._id, dedication: 40 },
    ];

    expect(resolveDedicationsForProjects(dedications, [projectA])).toEqual([
      { projectId: projectA._id, dedication: 100 },
    ]);
  });

  it("accepts valid dedications for multiple assigned projects", () => {
    const dedications: ProjectDedicationInput[] = [
      { projectId: projectA._id, dedication: 60 },
      { projectId: projectB._id, dedication: 40 },
    ];

    expect(resolveDedicationsForProjects(dedications, [projectA, projectB])).toEqual(
      dedications
    );
  });

  it("rejects missing dedications for multiple assigned projects", () => {
    const dedications: ProjectDedicationInput[] = [
      { projectId: projectA._id, dedication: 100 },
    ];

    expect(() =>
      resolveDedicationsForProjects(dedications, [projectA, projectB])
    ).toThrow("Debes indicar dedicación para todos tus proyectos asignados");
  });

  it("rejects dedications for unassigned projects", () => {
    const dedications: ProjectDedicationInput[] = [
      { projectId: projectA._id, dedication: 50 },
      { projectId: "333333333333333333333333", dedication: 50 },
    ];

    expect(() =>
      resolveDedicationsForProjects(dedications, [projectA, projectB])
    ).toThrow("Solo puedes asignar dedicación a proyectos activos asignados");
  });

  it("rejects totals different than 100 for multiple projects", () => {
    const dedications: ProjectDedicationInput[] = [
      { projectId: projectA._id, dedication: 60 },
      { projectId: projectB._id, dedication: 30 },
    ];

    expect(() =>
      resolveDedicationsForProjects(dedications, [projectA, projectB])
    ).toThrow("La dedicación total debe sumar 100%");
  });
});
