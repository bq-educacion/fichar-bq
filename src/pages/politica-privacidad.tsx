import LegalDocument from "@/components/LegalDocument";
import SiteFooter from "@/components/SiteFooter";
import { PRIVACY_POLICY_DOCUMENT } from "@/lib/legalDocuments";
import styled from "@emotion/styled";
import Head from "next/head";

const PrivacyPolicyPage = () => {
  return (
    <>
      <Head>
        <title>Política de privacidad</title>
      </Head>

      <Page>
        <Content>
          <LegalDocument document={PRIVACY_POLICY_DOCUMENT} />
        </Content>
        <SiteFooter />
      </Page>
    </>
  );
};

const Page = styled.main`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 32px 16px 0;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f8f4f9, #f3f3f3 220px);
`;

const Content = styled.div`
  width: 860px;
  max-width: 100%;
`;

export default PrivacyPolicyPage;
