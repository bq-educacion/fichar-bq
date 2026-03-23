import { COMPANY_NAME } from "@/lib/legalDocuments";
import styled from "@emotion/styled";
import Link from "next/link";

const SiteFooter = () => {
  return (
    <Footer>
      <Copyright>
        © {COMPANY_NAME}, {new Date().getFullYear()}.
      </Copyright>
      <LinksRow>
        <FooterLink
          href="/politica-privacidad"
          target="_blank"
          rel="noopener noreferrer"
        >
          Política de privacidad
        </FooterLink>
        <Separator>·</Separator>
        <FooterLink
          href="/terminos-legales"
          target="_blank"
          rel="noopener noreferrer"
        >
          Términos legales
        </FooterLink>
      </LinksRow>
    </Footer>
  );
};

const Footer = styled.footer`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  margin-bottom: 20px;
  padding: 0 16px;
  text-align: center;
  color: #4e4f53;
`;

const Copyright = styled.div`
  font-size: 14px;
`;

const LinksRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
`;

const FooterLink = styled(Link)`
  color: #8a4d92;
  font-weight: 700;
  text-decoration: underline;
`;

const Separator = styled.span`
  color: #8f9095;
`;

export default SiteFooter;
