import { dateToTimeInputValue, validateManualHoursRange } from "@/lib/utils";
import {
  myProjectDedicationsResponseSchema,
  ProjectDedicationInput,
  type ManualLogsBody,
} from "@/schemas/api";
import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";
import Modal from "react-modal";
import ProjectDedicationsPicker, {
  ProjectDedicationOption,
  buildDefaultProjectDedications,
} from "./ProjectDedicationsPicker";

export type ManualLogsData = ManualLogsBody;

const ManualLogsModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ManualLogsData) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const getCurrentBrowserHour = () => dateToTimeInputValue(new Date());

  const [startHour, setStartHour] = useState("09:00");
  const [endHour, setEndHour] = useState(getCurrentBrowserHour);
  const [pauses, setPauses] = useState<{ id: string; start: string; end: string }[]>([]);
  const [currentTimeLimit, setCurrentTimeLimit] = useState(getCurrentBrowserHour);
  const [projects, setProjects] = useState<ProjectDedicationOption[]>([]);
  const [projectDedications, setProjectDedications] = useState<ProjectDedicationInput[]>([]);
  const [dedicationsLoading, setDedicationsLoading] = useState(false);
  const [dedicationsError, setDedicationsError] = useState("");

  const validation = validateManualHoursRange(startHour, endHour);
  const validationError = validation.isValid ? null : validation.error;
  const dedicationTotal = projectDedications.reduce(
    (acc, item) => acc + item.dedication,
    0
  );
  const dedicationRemaining = 100 - dedicationTotal;
  const dedicationValidationError =
    projects.length > 0 && dedicationRemaining !== 0
      ? dedicationRemaining > 0
        ? `Te falta asignar ${dedicationRemaining}% de dedicación`
        : `Te has pasado ${Math.abs(dedicationRemaining)}% de dedicación`
      : null;

  useEffect(() => {
    if (!isOpen) return;

    const currentBrowserHour = getCurrentBrowserHour();
    setCurrentTimeLimit(currentBrowserHour);
    setEndHour(currentBrowserHour);

    const interval = setInterval(() => {
      setCurrentTimeLimit(dateToTimeInputValue(new Date()));
    }, 30000);

    let isCancelled = false;
    const fetchProjectDedications = async () => {
      setDedicationsLoading(true);
      setDedicationsError("");
      try {
        const res = await fetch("/api/myProjectDedications");
        if (!res.ok) {
          throw new Error(
            (await res.text()) || "No se pudieron cargar los proyectos"
          );
        }

        const payload = myProjectDedicationsResponseSchema.parse(await res.json());
        if (isCancelled) {
          return;
        }

        setProjects(payload.projects);
        setProjectDedications(
          buildDefaultProjectDedications(
            payload.projects,
            payload.existingDedications
          )
        );
      } catch (err) {
        if (isCancelled) {
          return;
        }
        setDedicationsError(
          err instanceof Error
            ? err.message.replace(/^Bad Request:\s*/i, "")
            : "No se pudieron cargar los proyectos"
        );
        setProjects([]);
        setProjectDedications([]);
      } finally {
        if (!isCancelled) {
          setDedicationsLoading(false);
        }
      }
    };

    fetchProjectDedications();

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isOpen]);

  const addPause = () => {
    setPauses([...pauses, { id: crypto.randomUUID(), start: "13:00", end: "14:00" }]);
  };

  const removePause = (index: number) => {
    setPauses(pauses.filter((_, i) => i !== index));
  };

  const updatePause = (
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    const updated = [...pauses];
    updated[index] = { ...updated[index], [field]: value };
    setPauses(updated);
  };

  const handleSubmit = () => {
    if (validationError || dedicationValidationError || dedicationsError) return;
    onSubmit({
      startHour,
      endHour,
      pauses: pauses.map(({ start, end }) => ({ start, end })),
      projectDedications,
    });
  };

  return (
    <Modal isOpen={isOpen} style={modalStyles} contentLabel="Introducir fichaje manual">
      <ModalContent>
        <Title>Introducir fichaje manual</Title>
        <Subtitle>Introduce las horas de tu jornada de hoy</Subtitle>

        <FieldGroup>
          <Label>Hora de entrada</Label>
          <TimeInput
            type="time"
            value={startHour}
            max={endHour}
            onChange={(e) => setStartHour(e.target.value)}
          />
        </FieldGroup>

        {pauses.map((pause, index) => (
          <PauseRow key={pause.id}>
            <FieldGroup>
              <Label>Inicio pausa {index + 1}</Label>
              <TimeInput
                type="time"
                value={pause.start}
                onChange={(e) => updatePause(index, "start", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Fin pausa {index + 1}</Label>
              <TimeInput
                type="time"
                value={pause.end}
                onChange={(e) => updatePause(index, "end", e.target.value)}
              />
            </FieldGroup>
            <RemoveButton onClick={() => removePause(index)}>✕</RemoveButton>
          </PauseRow>
        ))}

        <AddPauseButton onClick={addPause}>+ Añadir pausa</AddPauseButton>

        <FieldGroup>
          <Label>Hora de salida</Label>
          <TimeInput
            type="time"
            value={endHour}
            min={startHour}
            max={currentTimeLimit}
            onChange={(e) => setEndHour(e.target.value)}
          />
        </FieldGroup>

        {dedicationsLoading ? (
          <LoadingText>Cargando proyectos...</LoadingText>
        ) : (
          <ProjectDedicationsPicker
            projects={projects}
            value={projectDedications}
            onChange={setProjectDedications}
          />
        )}

        {validationError && <ValidationError>{validationError}</ValidationError>}
        {dedicationValidationError && (
          <ValidationError>{dedicationValidationError}</ValidationError>
        )}
        {dedicationsError && <ValidationError>{dedicationsError}</ValidationError>}

        <ButtonRow>
          <CancelButton onClick={onClose}>Cancelar</CancelButton>
          <SubmitButton
            onClick={handleSubmit}
            disabled={
              !!validationError ||
              !!dedicationValidationError ||
              !!dedicationsError ||
              dedicationsLoading
            }
          >
            Guardar
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
    width: "400px",
    maxHeight: "80vh",
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
  padding: 30px;
  gap: 12px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: bold;
  color: #4e4f53;
`;

const Subtitle = styled.p`
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #7a7b7f;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #4e4f53;
  text-transform: uppercase;
`;

const TimeInput = styled.input`
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 12px;
  font-size: 16px;
  color: #4e4f53;
  outline: none;
  &:focus {
    border-color: #8a4d92;
  }
`;

const PauseRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
`;

const RemoveButton = styled.button`
  height: 40px;
  width: 40px;
  min-width: 40px;
  border: 1px solid #e4002b;
  border-radius: 4px;
  background: transparent;
  color: #e4002b;
  font-size: 16px;
  cursor: pointer;
  &:hover {
    background: #fde8ec;
  }
`;

const AddPauseButton = styled.button`
  background: transparent;
  border: 1px dashed #8a4d92;
  border-radius: 4px;
  padding: 8px;
  color: #8a4d92;
  font-size: 14px;
  cursor: pointer;
  &:hover {
    background: #f5eef6;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 12px;
`;

const CancelButton = styled.button`
  height: 44px;
  padding: 0 24px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: transparent;
  color: #4e4f53;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  &:hover {
    background: #f5f5f5;
  }
`;

const SubmitButton = styled.button`
  height: 44px;
  padding: 0 24px;
  border: none;
  border-radius: 4px;
  background-image: linear-gradient(247deg, #8a4d92, #ff1842);
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ValidationError = styled.p`
  margin: 0;
  color: #e4002b;
  font-size: 13px;
`;

const LoadingText = styled.div`
  font-size: 14px;
  color: #4e4f53;
`;

export default ManualLogsModal;
