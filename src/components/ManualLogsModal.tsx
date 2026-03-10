import { dateToTimeInputValue, validateManualHoursRange } from "@/lib/utils";
import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";
import Modal from "react-modal";

export type ManualLogsData = {
  startHour: string;
  endHour: string;
  pauses: { start: string; end: string }[];
};

const ManualLogsModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ManualLogsData) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const getCurrentBrowserHour = () => dateToTimeInputValue(new Date());

  const [startHour, setStartHour] = useState("09:00");
  const [endHour, setEndHour] = useState(getCurrentBrowserHour);
  const [pauses, setPauses] = useState<{ start: string; end: string }[]>([]);
  const [currentTimeLimit, setCurrentTimeLimit] = useState(getCurrentBrowserHour);

  const validation = validateManualHoursRange(startHour, endHour);
  const validationError = validation.isValid ? null : validation.error;

  useEffect(() => {
    if (!isOpen) return;

    const currentBrowserHour = getCurrentBrowserHour();
    setCurrentTimeLimit(currentBrowserHour);
    setEndHour(currentBrowserHour);

    const interval = setInterval(() => {
      setCurrentTimeLimit(dateToTimeInputValue(new Date()));
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const addPause = () => {
    setPauses([...pauses, { start: "13:00", end: "14:00" }]);
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
    if (validationError) return;
    onSubmit({ startHour, endHour, pauses });
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
          <PauseRow key={index}>
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

        {validationError && <ValidationError>{validationError}</ValidationError>}

        <ButtonRow>
          <CancelButton onClick={onClose}>Cancelar</CancelButton>
          <SubmitButton onClick={handleSubmit} disabled={!!validationError}>
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

export default ManualLogsModal;
