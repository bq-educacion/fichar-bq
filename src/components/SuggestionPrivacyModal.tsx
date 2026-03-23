import {
  SUGGESTION_PRIVACY_PARAGRAPHS,
  SUGGESTION_PRIVACY_TITLE,
} from "@/lib/suggestionPrivacy";
import styled from "@emotion/styled";
import type { FC } from "react";
import Modal from "react-modal";

interface SuggestionPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SuggestionPrivacyModal: FC<SuggestionPrivacyModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={modalStyles}
      contentLabel={SUGGESTION_PRIVACY_TITLE}
    >
      <ModalContent>
        <Header>
          <Title>{SUGGESTION_PRIVACY_TITLE}</Title>
          <CloseButton type="button" onClick={onClose}>
            Cerrar
          </CloseButton>
        </Header>

        <Body>
          {SUGGESTION_PRIVACY_PARAGRAPHS.map((paragraph) => (
            <Paragraph key={paragraph}>{paragraph}</Paragraph>
          ))}
        </Body>
      </ModalContent>
    </Modal>
  );
};

const modalStyles = {
  content: {
    position: "static" as const,
    inset: "auto",
    width: "100%",
    maxWidth: "720px",
    overflow: "visible",
    border: "none",
    padding: "0",
    background: "transparent",
  },
  overlay: {
    backgroundColor: "rgba(44, 45, 49, 0.45)",
    zIndex: 1100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
};

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  background: #f3f3f3;
  box-shadow: 0 18px 45px rgba(34, 35, 38, 0.22);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid #e0e0e0;
  background-image: linear-gradient(220deg, #eee, #e7e7e7);
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #4e4f53;
`;

const CloseButton = styled.button`
  height: 36px;
  padding: 0 14px;
  border: 1px solid #d1d1d1;
  border-radius: 4px;
  background: #fff;
  color: #4e4f53;
  font-weight: 600;
  cursor: pointer;
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
`;

const Paragraph = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #5a5b60;
`;

export default SuggestionPrivacyModal;
