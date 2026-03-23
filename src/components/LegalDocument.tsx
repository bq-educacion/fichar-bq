import type { LegalDocumentDefinition } from "@/lib/legalDocuments";
import styled from "@emotion/styled";
import type { FC } from "react";

const LegalDocument: FC<{
  document: LegalDocumentDefinition;
  titleAs?: "h1" | "h2";
}> = ({ document, titleAs = "h1" }) => {
  const TitleTag = titleAs;

  return (
    <DocumentCard>
      <DocumentHeader>
        <Title as={TitleTag}>{document.title}</Title>
        <UpdatedAt>Última actualización: {document.updatedAt}</UpdatedAt>
        <Description>{document.description}</Description>
      </DocumentHeader>

      <Sections>
        {document.sections.map((section) => (
          <Section key={section.title}>
            <SectionTitle>{section.title}</SectionTitle>

            {section.paragraphs?.map((paragraph) => (
              <Paragraph key={paragraph}>{paragraph}</Paragraph>
            ))}

            {section.items && (
              <List>
                {section.items.map((item) => (
                  <ListItem key={item}>{item}</ListItem>
                ))}
              </List>
            )}
          </Section>
        ))}
      </Sections>
    </DocumentCard>
  );
};

const DocumentCard = styled.article`
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 20px 50px rgba(36, 37, 41, 0.1);
  border: 1px solid #ece7ee;
`;

const DocumentHeader = styled.header`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 28px 30px 22px;
  background: linear-gradient(180deg, #faf7fb, #f2edf4);
  border-bottom: 1px solid #ece7ee;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  color: #2f3034;
`;

const UpdatedAt = styled.div`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8a4d92;
`;

const Description = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #5b5c63;
`;

const Sections = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 28px 30px 32px;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
  color: #2f3034;
`;

const Paragraph = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #52545b;
`;

const List = styled.ul`
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #52545b;
`;

const ListItem = styled.li`
  font-size: 14px;
  line-height: 1.7;
`;

export default LegalDocument;
