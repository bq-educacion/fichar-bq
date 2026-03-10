import { ProjectDedicationInput } from "@/schemas/api";

export type ProjectDedicationOption = {
  _id: string;
  name: string;
};

export const buildDefaultProjectDedications = (
  projects: ProjectDedicationOption[],
  existingDedications: ProjectDedicationInput[]
): ProjectDedicationInput[] => {
  if (projects.length === 0) {
    return [];
  }

  const existingByProject = new Map(
    existingDedications.map((item) => [item.projectId, item.dedication] as const)
  );

  const hasCompleteExisting =
    existingDedications.length === projects.length &&
    projects.every((project) => existingByProject.has(project._id)) &&
    existingDedications.reduce((acc, item) => acc + item.dedication, 0) === 100;

  if (hasCompleteExisting) {
    return projects.map((project) => ({
      projectId: project._id,
      dedication: existingByProject.get(project._id) ?? 0,
    }));
  }

  const base = Math.floor(100 / projects.length / 10) * 10;
  let remaining = 100 - base * projects.length;

  return projects.map((project) => {
    const extra = remaining >= 10 ? 10 : 0;
    remaining -= extra;
    return {
      projectId: project._id,
      dedication: base + extra,
    };
  });
};
