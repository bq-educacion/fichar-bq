import styled from "@emotion/styled";
import { suggestionSchema, MAX_SUGGESTION_LENGTH } from "@/schemas/suggestion";
import { useRouter } from "next/router";
import React, { FC, FormEvent, useEffect, useRef, useState } from "react";
import Modal from "react-modal";

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const normalizeError = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return error.message.replace(/^Bad Request:\s*/i, "");
  }

  return fallback;
};

const SuggestionModal: FC<SuggestionModalProps> = ({
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const router = useRouter();
  const closeTimeoutRef = useRef<number | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const trimmedText = text.trim();
  const canSubmit = !loading && trimmedText.length > 0;

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleClose = () => {
    clearCloseTimeout();
    setLoading(false);
    setSuccess(false);
    setError("");
    setText("");
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccess(false);
      return;
    }

    clearCloseTimeout();
    setLoading(false);
    setSuccess(false);
    setError("");
    setText("");
  }, [isOpen]);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmedText }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error((await res.text()) || "No se pudo enviar la sugerencia");
      }

      suggestionSchema.parse(await res.json());
      setSuccess(true);
      setText("");
      onSubmitted?.();
      closeTimeoutRef.current = window.setTimeout(() => {
        closeTimeoutRef.current = null;
        handleClose();
      }, 1500);
    } catch (submitError) {
      setError(
        normalizeError(submitError, "No se pudo enviar la sugerencia")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={loading ? undefined : handleClose}
      style={modalStyles}
      contentLabel="Enviar sugerencia anónima"
    >
      <ModalForm onSubmit={handleSubmit}>
        <Header>
          <Title>Enviar sugerencia anónima</Title>
          <Subtitle>
            Comparte mejoras, incidencias o comentarios. El mensaje se guarda
            sin asociarlo a tu usuario.
          </Subtitle>
        </Header>

        <TextArea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Cuéntanos qué debería mejorar, qué has detectado o qué te gustaría cambiar..."
          maxLength={MAX_SUGGESTION_LENGTH}
          required
          disabled={loading}
          autoFocus
        />

        <HelperRow>
          <HelperText>
            Cuanto más contexto incluyas, más fácil será revisarlo.
          </HelperText>
          <Counter>
            {text.length}/{MAX_SUGGESTION_LENGTH}
          </Counter>
        </HelperRow>

        {success && <SuccessText>Gracias, lo hemos recibido.</SuccessText>}
        {error && <ErrorText>{error}</ErrorText>}

        <ButtonRow>
          <CancelButton
            type="button"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </CancelButton>
          <SubmitButton type="submit" disabled={!canSubmit}>
            {loading ? "Enviando..." : "Enviar"}
          </SubmitButton>
        </ButtonRow>
      </ModalForm>
    </Modal>
  );
};

const modalStyles = {
  content: {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "460px",
    maxWidth: "calc(100vw - 32px)",
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

const ModalForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  line-height: 1.5;
  color: #6d6e72;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 150px;
  border-radius: 6px;
  border: 1px solid #d2d2d2;
  padding: 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #4e4f53;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #8a4d92;
    box-shadow: 0 0 0 3px rgba(138, 77, 146, 0.14);
  }
`;

const HelperRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
`;

const HelperText = styled.div`
  font-size: 13px;
  color: #6d6e72;
`;

const Counter = styled.div`
  font-size: 12px;
  white-space: nowrap;
  color: #6d6e72;
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

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
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

const SuccessText = styled.div`
  color: #2e7d32;
  font-size: 13px;
  font-weight: 600;
`;

const ErrorText = styled.div`
  color: #b00020;
  font-size: 13px;
  font-weight: 600;
`;

export default SuggestionModal;
