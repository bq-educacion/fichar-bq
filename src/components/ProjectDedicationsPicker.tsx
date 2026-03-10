import { ProjectDedicationInput } from "@/schemas/api";
import styled from "@emotion/styled";
import React, { FC, useMemo } from "react";

export type ProjectDedicationOption = {
  _id: string;
  name: string;
};

const PERCENT_OPTIONS = Array.from({ length: 11 }, (_, index) => index * 10);

const normalizeName = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");

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

const ProjectDedicationsPicker: FC<{
  projects: ProjectDedicationOption[];
  value: ProjectDedicationInput[];
  onChange: (nextValue: ProjectDedicationInput[]) => void;
}> = ({ projects, value, onChange }) => {
  const dedicationByProject = useMemo(
    () => new Map(value.map((item) => [item.projectId, item.dedication] as const)),
    [value]
  );

  const total = projects.reduce(
    (acc, project) => acc + (dedicationByProject.get(project._id) ?? 0),
    0
  );
  const remaining = 100 - total;

  const onProjectDedicationChange = (projectId: string, dedication: number) => {
    const next = projects.map((project) => ({
      projectId: project._id,
      dedication:
        project._id === projectId
          ? dedication
          : dedicationByProject.get(project._id) ?? 0,
    }));
    onChange(next);
  };

  if (projects.length === 0) {
    return <EmptyInfo>No tienes proyectos activos asignados hoy.</EmptyInfo>;
  }

  return (
    <Container>
      <Header>Dedicación por proyecto</Header>
      <Helper>
        {remaining === 0
          ? "Perfecto: has asignado el 100%."
          : remaining > 0
            ? `Te falta asignar ${remaining}%.`
            : `Te has pasado ${Math.abs(remaining)}%.`}
      </Helper>

      {projects.map((project) => (
        <Row key={project._id}>
          <ProjectName>{normalizeName(project.name)}</ProjectName>
          <Select
            value={dedicationByProject.get(project._id) ?? 0}
            onChange={(event) =>
              onProjectDedicationChange(project._id, Number(event.target.value))
            }
          >
            {PERCENT_OPTIONS.map((percent) => (
              <option key={percent} value={percent}>
                {percent}%
              </option>
            ))}
          </Select>
        </Row>
      ))}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f8f8f8;
`;

const Header = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #4e4f53;
  text-transform: uppercase;
`;

const Helper = styled.div`
  font-size: 13px;
  color: #4e4f53;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
`;

const ProjectName = styled.div`
  font-size: 13px;
  color: #4e4f53;
`;

const Select = styled.select`
  min-width: 110px;
  height: 34px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #4e4f53;
  padding: 0 8px;
  font-size: 13px;
`;

const EmptyInfo = styled.div`
  font-size: 13px;
  color: #6d6e72;
  margin-top: 4px;
`;

export default ProjectDedicationsPicker;
