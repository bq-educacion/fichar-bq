import LegalDocument from "@/components/LegalDocument";
import {
  LEGAL_TERMS_DOCUMENT,
  PRIVACY_POLICY_DOCUMENT,
} from "@/lib/legalDocuments";
import styled from "@emotion/styled";
import React from "react";

const Legal = () => {
  return (
    <Container>
      <IntroCard>
        <IntroTitle>Lectura previa obligatoria</IntroTitle>
        <IntroText>
          Antes de continuar, revisa los términos legales de uso y la política
          de privacidad aplicables a la plataforma.
        </IntroText>
      </IntroCard>

      <Documents>
        <LegalDocument document={LEGAL_TERMS_DOCUMENT} titleAs="h2" />
        <LegalDocument document={PRIVACY_POLICY_DOCUMENT} titleAs="h2" />
      </Documents>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  width: 860px;
  max-width: 100%;
  margin-top: 10px;
`;

const IntroCard = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding: 18px 22px;
  border-radius: 10px;
  background: linear-gradient(180deg, #fff, #f5f0f6);
  border: 1px solid #ece2ee;
  color: #4e4f53;
`;

const IntroTitle = styled.h1`
  margin: 0 0 8px;
  font-size: 22px;
`;

const IntroText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #5b5c63;
`;

const Documents = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

export default Legal;
