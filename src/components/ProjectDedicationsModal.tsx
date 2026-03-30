import {
  myProjectDedicationsResponseSchema,
  ProjectDedicationInput,
} from "@/schemas/api";
import { createBrowserTimeSearchParams } from "@/lib/browserTime";
import styled from "@emotion/styled";
import React, { FC, useEffect, useMemo, useState } from "react";
import Modal from "react-modal";
import ProjectDedicationsPicker, {
  ProjectDedicationOption,
  buildDefaultProjectDedications,
} from "./ProjectDedicationsPicker";

const ProjectDedicationsModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dedications: ProjectDedicationInput[]) => Promise<void> | void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [projects, setProjects] = useState<ProjectDedicationOption[]>([]);
  const [dedications, setDedications] = useState<ProjectDedicationInput[]>([]);
  const [showDedications, setShowDedications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchOptions = async () => {
      setLoading(true);
      setError("");

      try {
        const query = createBrowserTimeSearchParams();
        const res = await fetch(`/api/myProjectDedications?${query.toString()}`);
        if (!res.ok) {
          throw new Error((await res.text()) || "No se pudieron cargar los proyectos");
        }

        const payload = myProjectDedicationsResponseSchema.parse(await res.json());
        setShowDedications(payload.showDedications);
        setProjects(payload.projects);
        setDedications(
          buildDefaultProjectDedications(payload.projects, payload.existingDedications)
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los proyectos"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [isOpen]);

  const total = useMemo(
    () => dedications.reduce((acc, item) => acc + item.dedication, 0),
    [dedications]
  );
  const canSubmit = !loading && !submitting && (projects.length === 0 || total === 100);

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onSubmit(dedications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la dedicación");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} style={modalStyles} contentLabel="Dedicación a proyectos">
      <ModalContent>
        <Title>Dedicación a proyectos</Title>
        <Subtitle>
          {showDedications
            ? "Antes de salir, indica el porcentaje dedicado a cada proyecto."
            : "No necesitas registrar dedicaciones en este fichaje."}
        </Subtitle>

        {loading ? (
          <LoadingText>Cargando proyectos...</LoadingText>
        ) : !showDedications ? (
          <DisabledText>
            Se asignará automáticamente la dedicación correspondiente para hoy.
          </DisabledText>
        ) : (
          <ProjectDedicationsPicker
            projects={projects}
            value={dedications}
            onChange={setDedications}
          />
        )}

        {error && <ErrorText>{error.replace(/^Bad Request:\s*/i, "")}</ErrorText>}

        <ButtonRow>
          <CancelButton onClick={onClose} disabled={submitting}>
            Cancelar
          </CancelButton>
          <SubmitButton onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? "Guardando..." : "Confirmar salida"}
          </SubmitButton>
        </ButtonRow>
      </ModalContent>
    </Modal>
  );
};

const modalStyles = {
  content: {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "430px",
    maxHeight: "85vh",
    overflow: "auto",
    border: "none",
    borderRadius: "8px",
    padding: "0",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
};

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: bold;
  color: #4e4f53;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #6d6e72;
`;

const LoadingText = styled.div`
  font-size: 14px;
  color: #4e4f53;
`;

const DisabledText = styled.div`
  font-size: 14px;
  color: #4e4f53;
`;

const ErrorText = styled.div`
  color: #b00020;
  font-size: 13px;
  font-weight: 600;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
`;

const CancelButton = styled.button`
  height: 40px;
  padding: 0 18px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #4e4f53;
  font-weight: 600;
  cursor: pointer;
`;

const SubmitButton = styled.button`
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 4px;
  background-image: linear-gradient(247deg, #8a4d92, #ff1842);
  color: #fff;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default ProjectDedicationsModal;
