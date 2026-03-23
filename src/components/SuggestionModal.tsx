import styled from "@emotion/styled";
import { suggestionSchema, MAX_SUGGESTION_LENGTH } from "@/schemas/suggestion";
import { useRouter } from "next/router";
import React, { FC, FormEvent, useEffect, useRef, useState } from "react";
import Modal from "react-modal";

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
  onOpenPrivacyPolicy: () => void;
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
  onOpenPrivacyPolicy,
}) => {
  const router = useRouter();
  const closeTimeoutRef = useRef<number | null>(null);
  const [text, setText] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const trimmedText = text.trim();
  const canSubmit = !loading && trimmedText.length > 0 && privacyAccepted;

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
    setPrivacyAccepted(false);
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
    setPrivacyAccepted(false);
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
        body: JSON.stringify({
          text: trimmedText,
          privacyAccepted: privacyAccepted,
        }),
      });

      if (res.status === 401) {
        void router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error((await res.text()) || "No se pudo enviar el mensaje");
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
      setError(normalizeError(submitError, "No se pudo enviar el mensaje"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={loading ? undefined : handleClose}
      style={modalStyles}
      contentLabel="Enviar sugerencia o queja laboral"
    >
      <ModalForm onSubmit={handleSubmit}>
        <TopBar>
          <TopBarText>Buzón laboral anónimo</TopBarText>
        </TopBar>

        <Header>
          <Title>Sugerencia o queja laboral</Title>
          <Subtitle>
            Este buzón es para comunicar propuestas, incidencias o quejas sobre
            la empresa. El contenido se registra sin asociarse a tu perfil
            visible dentro del buzón.
          </Subtitle>
          <PrivacyNote>
            Consulta la política de privacidad correspondiente para conocer los
            accesos autorizados, la posible difusión interna y las garantías de
            confidencialidad aplicables.
          </PrivacyNote>
        </Header>

        <InputSection>
          <FieldLabel htmlFor="suggestion-text">
            Escribe tu mensaje
          </FieldLabel>
          <TextArea
            id="suggestion-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Describe la situación, la propuesta o la queja laboral que quieras trasladar a dirección..."
            maxLength={MAX_SUGGESTION_LENGTH}
            required
            disabled={loading}
            autoFocus
          />
        </InputSection>

        <HelperRow>
          <HelperText>
            Incluye el contexto necesario para que dirección pueda revisarlo con
            criterio.
          </HelperText>
          <Counter>
            {text.length}/{MAX_SUGGESTION_LENGTH}
          </Counter>
        </HelperRow>

        <ConsentRow>
          <ConsentCheckbox
            id="suggestion-privacy-accepted"
            type="checkbox"
            checked={privacyAccepted}
            onChange={(event) => setPrivacyAccepted(event.target.checked)}
            disabled={loading}
          />
          <ConsentText>
            <ConsentLabel htmlFor="suggestion-privacy-accepted">
              He leído la{" "}
            </ConsentLabel>
            <PrivacyLinkButton
              type="button"
              onClick={onOpenPrivacyPolicy}
              disabled={loading}
            >
              política de privacidad correspondiente
            </PrivacyLinkButton>
          </ConsentText>
        </ConsentRow>

        {success && (
          <SuccessText>Mensaje enviado correctamente.</SuccessText>
        )}
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
    position: "static" as const,
    inset: "auto",
    width: "100%",
    maxWidth: "640px",
    overflow: "visible",
    border: "none",
    padding: "0",
    background: "transparent",
  },
  overlay: {
    backgroundColor: "rgba(44, 45, 49, 0.45)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
};

const ModalForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
  border-radius: 8px;
  background: #f3f3f3;
  box-shadow: 0 18px 45px rgba(34, 35, 38, 0.22);
`;

const TopBar = styled.div`
  width: 100%;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  box-sizing: border-box;
  background-image: linear-gradient(220deg, #eee, #e7e7e7);
  border-bottom: 1px solid #e0e0e0;
`;

const TopBarText = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #4e4f53;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px 24px 0;
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

const PrivacyNote = styled.div`
  padding: 10px 12px;
  border: 1px solid #e2d8e4;
  border-radius: 6px;
  background: linear-gradient(180deg, #faf6fb, #f4edf6);
  font-size: 13px;
  line-height: 1.5;
  color: #5f5f66;
`;

const InputSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 24px;
`;

const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #4e4f53;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 260px;
  box-sizing: border-box;
  border-radius: 6px;
  border: 1px solid #d7d7d7;
  background: #fff;
  padding: 14px 15px;
  font-size: 14px;
  line-height: 1.5;
  color: #4e4f53;
  resize: none;

  &:focus {
    outline: none;
    border-color: #8a4d92;
    box-shadow: 0 0 0 3px rgba(138, 77, 146, 0.14);
  }

  &::placeholder {
    color: #8a8b91;
  }

  @media (max-width: 640px) {
    min-height: 220px;
  }
`;

const HelperRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  padding: 0 24px;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const HelperText = styled.div`
  font-size: 13px;
  color: #6d6e72;
`;

const ConsentRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 0 24px;
`;

const ConsentCheckbox = styled.input`
  width: 16px;
  height: 16px;
  margin-top: 2px;
  accent-color: #8a4d92;
`;

const ConsentText = styled.div`
  font-size: 13px;
  line-height: 1.5;
  color: #5d5f66;
`;

const ConsentLabel = styled.label`
  cursor: pointer;
`;

const PrivacyLinkButton = styled.button`
  border: none;
  padding: 0;
  background: transparent;
  color: #8a4d92;
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.7;
  }
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
  padding: 4px 24px 24px;

  @media (max-width: 640px) {
    flex-direction: column-reverse;
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

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    width: 100%;
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

  @media (max-width: 640px) {
    width: 100%;
  }
`;

const SuccessText = styled.div`
  padding: 0 24px;
  color: #2e7d32;
  font-size: 13px;
  font-weight: 600;
`;

const ErrorText = styled.div`
  padding: 0 24px;
  color: #b00020;
  font-size: 13px;
  font-weight: 600;
`;

export default SuggestionModal;
