import { suggestionSchema, suggestionsResponseSchema } from "@/schemas/suggestion";
import type { Suggestion } from "@/types/suggestion";
import styled from "@emotion/styled";
import { useRouter } from "next/router";
import React, { FC, useCallback, useEffect, useState } from "react";

const formatSuggestionDate = (date: Date): string =>
  date.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const normalizeError = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return error.message.replace(/^Bad Request:\s*/i, "");
  }

  return fallback;
};

const AdminSuggestions: FC = () => {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/suggestions?archived=${showArchived}`);

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.status === 403) {
        router.push("/");
        return;
      }

      if (!res.ok) {
        throw new Error(
          (await res.text()) || "No se pudieron cargar las sugerencias"
        );
      }

      const payload = suggestionsResponseSchema.parse(await res.json());
      setSuggestions(payload);
    } catch (fetchError) {
      setError(
        normalizeError(fetchError, "No se pudieron cargar las sugerencias")
      );
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [router, showArchived]);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  const handleArchive = async (suggestion: Suggestion) => {
    setUpdatingId(suggestion._id);
    setError("");

    try {
      const res = await fetch("/api/admin/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: suggestion._id,
          archived: !suggestion.archived,
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.status === 403) {
        router.push("/");
        return;
      }

      if (!res.ok) {
        throw new Error(
          (await res.text()) || "No se pudo actualizar la sugerencia"
        );
      }

      const updatedSuggestion = suggestionSchema.parse(await res.json());
      setSuggestions((previous) =>
        updatedSuggestion.archived === showArchived
          ? previous.map((item) =>
              item._id === updatedSuggestion._id ? updatedSuggestion : item
            )
          : previous.filter((item) => item._id !== updatedSuggestion._id)
      );
    } catch (updateError) {
      setError(
        normalizeError(updateError, "No se pudo actualizar la sugerencia")
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Container>
      <Toolbar>
        <div>
          <SectionTitle>
            {showArchived ? "Archivadas" : "Activas"} · {suggestions.length}
          </SectionTitle>
          <SectionDescription>
            Revisa el buzón anónimo y archiva lo ya tratado para mantener la
            lista operativa.
          </SectionDescription>
        </div>
        <FilterGroup>
          <FilterButton
            type="button"
            $active={!showArchived}
            onClick={() => setShowArchived(false)}
          >
            Activas
          </FilterButton>
          <FilterButton
            type="button"
            $active={showArchived}
            onClick={() => setShowArchived(true)}
          >
            Archivadas
          </FilterButton>
        </FilterGroup>
      </Toolbar>

      {error && <ErrorBox>{error}</ErrorBox>}

      {loading ? (
        <InfoBox>Cargando sugerencias...</InfoBox>
      ) : suggestions.length === 0 ? (
        <InfoBox>
          No hay sugerencias {showArchived ? "archivadas" : "activas"}.
        </InfoBox>
      ) : (
        <SuggestionsList>
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion._id}
              $archived={suggestion.archived}
            >
              <CardHeader>
                <MetaBlock>
                  <DateText>{formatSuggestionDate(suggestion.date)}</DateText>
                  <Badge $archived={suggestion.archived}>
                    {suggestion.archived ? "Archivada" : "Activa"}
                  </Badge>
                </MetaBlock>
                <ActionButton
                  type="button"
                  onClick={() => void handleArchive(suggestion)}
                  disabled={updatingId === suggestion._id}
                >
                  {updatingId === suggestion._id
                    ? "Guardando..."
                    : suggestion.archived
                      ? "Recuperar"
                      : "Archivar"}
                </ActionButton>
              </CardHeader>
              <SuggestionText>{suggestion.text}</SuggestionText>
            </SuggestionCard>
          ))}
        </SuggestionsList>
      )}
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
  padding: 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #4e4f53;
`;

const SectionDescription = styled.p`
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: #6d6e72;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ $active: boolean }>`
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 4px;
  background: ${({ $active }) =>
    $active ? "linear-gradient(247deg, #8a4d92, #ff1842)" : "#d9d9d9"};
  color: ${({ $active }) => ($active ? "#fff" : "#4e4f53")};
  font-weight: 700;
  cursor: pointer;
`;

const InfoBox = styled.div`
  width: 100%;
  padding: 24px 18px;
  border-radius: 8px;
  border: 1px dashed #cfcfcf;
  background: rgba(255, 255, 255, 0.55);
  text-align: center;
  color: #6d6e72;
`;

const ErrorBox = styled.div`
  width: 100%;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid rgba(176, 0, 32, 0.18);
  background: rgba(176, 0, 32, 0.06);
  color: #b00020;
  font-size: 14px;
  font-weight: 600;
`;

const SuggestionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const SuggestionCard = styled.article<{ $archived: boolean }>`
  width: 100%;
  padding: 18px 20px;
  border-radius: 8px;
  border: 1px solid #dddddd;
  background: ${({ $archived }) =>
    $archived ? "rgba(255, 255, 255, 0.78)" : "#fff"};
  opacity: ${({ $archived }) => ($archived ? 0.8 : 1)};
  box-sizing: border-box;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
`;

const MetaBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const DateText = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #6d2077;
`;

const Badge = styled.span<{ $archived: boolean }>`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: ${({ $archived }) =>
    $archived ? "rgba(109, 110, 114, 0.12)" : "rgba(246, 160, 1, 0.16)"};
  color: ${({ $archived }) => ($archived ? "#4e4f53" : "#8a4d92")};
`;

const SuggestionText = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #4e4f53;
  white-space: pre-wrap;
`;

const ActionButton = styled.button`
  height: 38px;
  padding: 0 16px;
  border: 1px solid #cccccc;
  border-radius: 4px;
  background: #fff;
  color: #4e4f53;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default AdminSuggestions;
