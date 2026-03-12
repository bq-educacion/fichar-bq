import {
  dateToTimeInputValue,
  hhmmToMinutes,
  validateSequentialUniqueTimes,
} from "@/lib/utils";
import { todayLogsResponseSchema } from "@/schemas/api";
import { LOG_TYPE, Log } from "@/types";
import styled from "@emotion/styled";
import { useRouter } from "next/router";
import React, { FC, useEffect, useMemo, useState } from "react";
import Modal from "react-modal";

type EditableTodayLog = {
  _id: string;
  type: LOG_TYPE;
  time: string;
};

const toEditableTodayLogs = (logs: Log[]): EditableTodayLog[] =>
  [...logs]
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        a._id.localeCompare(b._id)
    )
    .map((log) => ({
      _id: log._id.toString(),
      type: log.type,
      time: dateToTimeInputValue(new Date(log.date)),
    }));

const LOG_TYPE_LABEL: Record<LOG_TYPE, string> = {
  in: "Entrada",
  out: "Salida",
  pause: "Pausa",
  goback: "Entrada",
};

const TodayLogsModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
}> = ({ isOpen, onClose, onUpdated }) => {
  const router = useRouter();
  const [logs, setLogs] = useState<EditableTodayLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentTimeLimit, setCurrentTimeLimit] = useState(
    dateToTimeInputValue(new Date())
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCurrentTimeLimit(dateToTimeInputValue(new Date()));
    const interval = setInterval(() => {
      setCurrentTimeLimit(dateToTimeInputValue(new Date()));
    }, 30000);

    const browserTimezoneOffsetMinutes = new Date().getTimezoneOffset();
    const fetchTodayLogs = async () => {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      try {
        const params = new URLSearchParams({
          clientTimezoneOffsetMinutes: String(browserTimezoneOffsetMinutes),
        });
        const res = await fetch(`/api/todayLogs?${params.toString()}`);
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          throw new Error((await res.text()) || "No se pudieron cargar los fichajes");
        }

        const payload = todayLogsResponseSchema.parse(await res.json());
        setLogs(toEditableTodayLogs(payload));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message.replace(/^Bad Request:\s*/i, "")
            : "No se pudieron cargar los fichajes"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTodayLogs();

    return () => {
      clearInterval(interval);
    };
  }, [isOpen, router]);

  const chronologyValidation = useMemo(
    () => validateSequentialUniqueTimes(logs.map((log) => log.time)),
    [logs]
  );

  const chronologyError =
    logs.length === 0 || chronologyValidation.isValid
      ? null
      : chronologyValidation.error;

  const futureTimeError = useMemo(() => {
    if (logs.length === 0) {
      return null;
    }

    const nowMinutes = hhmmToMinutes(currentTimeLimit);
    if (nowMinutes === null) {
      return "Formato de hora invalido";
    }

    const hasFutureTimes = logs.some((log) => {
      const logMinutes = hhmmToMinutes(log.time);
      return logMinutes !== null && logMinutes > nowMinutes;
    });

    return hasFutureTimes
      ? "No puedes introducir una hora posterior a la hora actual"
      : null;
  }, [currentTimeLimit, logs]);

  const canSubmit =
    !loading &&
    !submitting &&
    !deleting &&
    logs.length > 0 &&
    !chronologyError &&
    !futureTimeError;
  const canDelete = !loading && !submitting && !deleting && logs.length > 1;

  const updateLogTime = (index: number, time: string) => {
    const nextLogs = [...logs];
    nextLogs[index] = { ...nextLogs[index], time };
    setLogs(nextLogs);
    setError("");
    setSuccessMessage("");
  };

  const submitUpdatedLogs = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/todayLogs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs: logs.map(({ _id, time }) => ({ _id, time })),
          clientTimezoneOffsetMinutes: new Date().getTimezoneOffset(),
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error((await res.text()) || "No se pudieron guardar los cambios");
      }

      await onUpdated?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replace(/^Bad Request:\s*/i, "")
          : "No se pudieron guardar los cambios"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAllExceptFirst = async () => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      "Se eliminarán todos los fichajes de hoy excepto el primero. ¿Continuar?"
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccessMessage("");

    try {
      const params = new URLSearchParams({
        clientTimezoneOffsetMinutes: String(new Date().getTimezoneOffset()),
      });
      const res = await fetch(`/api/todayLogs?${params.toString()}`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error((await res.text()) || "No se pudieron eliminar los fichajes");
      }

      const payload = todayLogsResponseSchema.parse(await res.json());
      setLogs(toEditableTodayLogs(payload));
      setSuccessMessage("Fichajes eliminados");
      await onUpdated?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replace(/^Bad Request:\s*/i, "")
          : "No se pudieron eliminar los fichajes"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} style={modalStyles} contentLabel="Editar fichajes de hoy">
      <ModalContent>
        <Title>Editar fichajes de hoy</Title>
        <Subtitle>
          Modifica las horas en formato HH:MM. Deben estar en orden cronológico y
          no repetirse.
        </Subtitle>

        {loading ? (
          <InfoText>Cargando fichajes...</InfoText>
        ) : logs.length === 0 ? (
          <InfoText>No hay fichajes de hoy.</InfoText>
        ) : (
          <LogsList>
            {logs.map((log, index) => (
              <LogRow key={log._id}>
                <LogLabel>
                  {LOG_TYPE_LABEL[log.type]} {index + 1}
                </LogLabel>
                <TimeInput
                  type="time"
                  value={log.time}
                  max={currentTimeLimit}
                  onChange={(event) => updateLogTime(index, event.target.value)}
                />
              </LogRow>
            ))}
          </LogsList>
        )}

        {chronologyError && <ValidationError>{chronologyError}</ValidationError>}
        {futureTimeError && <ValidationError>{futureTimeError}</ValidationError>}
        {error && <ValidationError>{error}</ValidationError>}
        {successMessage && <SuccessText>{successMessage}</SuccessText>}

        <ButtonRow>
          <DeleteButton onClick={deleteAllExceptFirst} disabled={!canDelete}>
            {deleting ? "Eliminando..." : "Eliminar todos menos el primero"}
          </DeleteButton>
          <CancelButton onClick={onClose} disabled={submitting || deleting}>
            Cancelar
          </CancelButton>
          <SubmitButton onClick={submitUpdatedLogs} disabled={!canSubmit}>
            {submitting ? "Guardando..." : "Guardar cambios"}
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
    width: "560px",
    maxWidth: "95vw",
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
  font-weight: 700;
  color: #4e4f53;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #6d6e72;
`;

const InfoText = styled.div`
  font-size: 14px;
  color: #4e4f53;
`;

const LogsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const LogRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 130px;
  gap: 10px;
  align-items: center;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const LogLabel = styled.div`
  font-size: 14px;
  color: #4e4f53;
  font-weight: 600;
`;

const TimeInput = styled.input`
  width: 100%;
  height: 36px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 10px;
  font-size: 14px;
`;

const ValidationError = styled.div`
  color: #b00020;
  font-size: 13px;
  font-weight: 600;
`;

const SuccessText = styled.div`
  color: #1f7a2e;
  font-size: 13px;
  font-weight: 600;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
`;

const DeleteButton = styled.button`
  height: 40px;
  padding: 0 14px;
  border: 1px solid #b00020;
  border-radius: 4px;
  background: #fff;
  color: #b00020;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
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

export default TodayLogsModal;
