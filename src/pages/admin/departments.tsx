import AdminSectionTabs from "@/components/AdminSectionTabs";
import getUserByEmail from "@/controllers/getUser";
import connectMongo from "@/lib/connectMongo";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  AdminDepartmentsResponse,
  adminDepartmentsResponseSchema,
} from "@/schemas/api";
import SimpleContainer from "@/ui/SimpleContainer";
import styled from "@emotion/styled";
import { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const ADMIN_PANEL_MAX_WIDTH = "980px";

type DepartmentFormState = {
  name: string;
  costesGenerales: boolean;
};

const initialFormState = (): DepartmentFormState => ({
  name: "",
  costesGenerales: false,
});

const toCapitalizedWords = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.email) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  await connectMongo();

  const user = await getUserByEmail(session.user.email);
  if (!user.legal) {
    return {
      redirect: {
        destination: "/legal",
        permanent: false,
      },
    };
  }

  if (!user.admin) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
};

const AdminDepartmentsPage: NextPage = () => {
  const router = useRouter();

  const [departments, setDepartments] = useState<AdminDepartmentsResponse>([]);
  const [form, setForm] = useState<DepartmentFormState>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/admin/departments");

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        if (res.status === 403) {
          router.push("/");
          return;
        }

        if (!res.ok) {
          throw new Error((await res.text()) || "No se pudo cargar departamentos");
        }

        const data = adminDepartmentsResponseSchema.parse(await res.json());
        setDepartments(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("No se pudo cargar departamentos");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [router]);

  const resetForm = () => {
    setForm(initialFormState());
    setEditingId(null);
  };

  const onSubmit = async () => {
    setSaving(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        costesGenerales: form.costesGenerales,
      };
      const isEditing = Boolean(editingId);

      const res = await fetch("/api/admin/departments", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isEditing
            ? {
                ...payload,
                _id: editingId,
              }
            : payload
        ),
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
        throw new Error((await res.text()) || "No se pudo guardar el departamento");
      }

      const refreshedDepartments = adminDepartmentsResponseSchema.parse(
        await (await fetch("/api/admin/departments")).json()
      );
      setDepartments(refreshedDepartments);
      resetForm();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo guardar el departamento");
      }
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (departmentId: string) => {
    const department = departments.find((item) => item._id === departmentId);
    if (!department) {
      return;
    }

    setEditingId(department._id);
    setForm({
      name: department.name,
      costesGenerales: department.costesGenerales,
    });
  };

  const onDelete = async (departmentId: string) => {
    const confirmed = window.confirm("¿Eliminar este departamento?");
    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const res = await fetch("/api/admin/departments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ _id: departmentId }),
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
        throw new Error((await res.text()) || "No se pudo eliminar el departamento");
      }

      setDepartments((prev) => prev.filter((department) => department._id !== departmentId));

      if (editingId === departmentId) {
        resetForm();
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo eliminar el departamento");
      }
    }
  };

  return (
    <>
      <AdminSectionTabs active="departments" maxWidth={ADMIN_PANEL_MAX_WIDTH} />
      <SimpleContainer
        title="Administración · Departamentos"
        textColor="#4e4f53"
        fontSize="14px"
        height="40px"
        backgroundImage="linear-gradient(220deg, #eee, #eee)"
        maxWidth={ADMIN_PANEL_MAX_WIDTH}
      >
        <Content>
          <FormSection>
            <SectionTitle>
              {editingId ? "Editar departamento" : "Nuevo departamento"}
            </SectionTitle>

            <Field>
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del departamento"
              />
            </Field>

            <CheckboxRow>
              <Checkbox
                id="costes-generales"
                type="checkbox"
                checked={form.costesGenerales}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    costesGenerales: event.target.checked,
                  }))
                }
              />
              <CheckboxLabel htmlFor="costes-generales">
                Costes generales
              </CheckboxLabel>
            </CheckboxRow>

            <Actions>
              <PrimaryButton onClick={onSubmit} disabled={saving}>
                {saving
                  ? "Guardando..."
                  : editingId
                    ? "Guardar cambios"
                    : "Crear departamento"}
              </PrimaryButton>
              {editingId && (
                <SecondaryButton onClick={resetForm}>Cancelar edición</SecondaryButton>
              )}
            </Actions>

            {error && <ErrorText>{error}</ErrorText>}
          </FormSection>

          <ListSection>
            <ListHeader>
              <SectionTitle>Departamentos</SectionTitle>
              <HelperText>
                Las personas se asignan desde la sección de usuarios.
              </HelperText>
            </ListHeader>

            {loading ? (
              <LoadingText>Cargando departamentos...</LoadingText>
            ) : (
              <TableScroll>
                <DepartmentsTable rows={Math.max(departments.length, 1)}>
                  <HeaderCell>Nombre</HeaderCell>
                  <HeaderCell>Costes generales</HeaderCell>
                  <HeaderCell>Personas</HeaderCell>
                  <HeaderCell>Acciones</HeaderCell>

                  {departments.length === 0 ? (
                    <EmptyRow>Sin departamentos todavía</EmptyRow>
                  ) : (
                    departments.map((department) => (
                      <React.Fragment key={department._id}>
                        <Cell>{department.name}</Cell>
                        <Cell>{department.costesGenerales ? "Sí" : "No"}</Cell>
                        <Cell>
                          {department.people.length === 0
                            ? "-"
                            : department.people
                                .map((person) => {
                                  const displayName = toCapitalizedWords(
                                    person.name || person.email
                                  );
                                  return person.active
                                    ? displayName
                                    : `${displayName} (inactivo)`;
                                })
                                .join(", ")}
                        </Cell>
                        <Cell>
                          <RowActions>
                            <ActionButton onClick={() => onEdit(department._id)}>
                              Editar
                            </ActionButton>
                            <ActionButton $danger onClick={() => onDelete(department._id)}>
                              Eliminar
                            </ActionButton>
                          </RowActions>
                        </Cell>
                      </React.Fragment>
                    ))
                  )}
                </DepartmentsTable>
              </TableScroll>
            )}
          </ListSection>
        </Content>
      </SimpleContainer>
      <br />
      <br />
    </>
  );
};

const Content = styled.div`
  width: 100%;
  border-top: 2px solid #fff;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FormSection = styled.div`
  background: #eee;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ListSection = styled.div`
  background: #eee;
  padding: 0 16px 1px 16px;
`;

const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const HelperText = styled.div`
  font-size: 13px;
  color: #6d6e72;
`;

const SectionTitle = styled.div`
  font-size: 14px;
  font-weight: bold;
  color: #4e4f53;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #4e4f53;
  text-transform: uppercase;
`;

const Input = styled.input`
  height: 38px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  padding: 0 10px;
  font-size: 14px;
  color: #4e4f53;
  outline: none;

  &:focus {
    border-color: #8a4d92;
  }
`;

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
`;

const CheckboxLabel = styled.label`
  font-size: 14px;
  color: #4e4f53;
  font-weight: 600;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const PrimaryButton = styled.button`
  border: none;
  border-radius: 4px;
  height: 40px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  cursor: pointer;
  background-image: linear-gradient(256deg, #b68fbb, #ff5776);

  &:disabled {
    opacity: 0.65;
    cursor: wait;
  }
`;

const SecondaryButton = styled.button`
  border: 1px solid #c9c9c9;
  border-radius: 4px;
  height: 40px;
  padding: 0 12px;
  font-size: 14px;
  font-weight: bold;
  color: #4e4f53;
  cursor: pointer;
  background: transparent;
`;

const ErrorText = styled.div`
  font-size: 13px;
  color: #b00020;
  font-weight: 600;
`;

const LoadingText = styled.div`
  padding: 16px;
  color: #4e4f53;
  font-size: 14px;
`;

const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const DepartmentsTable = styled.div<{ rows: number }>`
  width: 100%;
  min-width: 860px;
  display: grid;
  grid-template-columns: 1fr 1fr 2fr 1fr;
  grid-template-rows: 45px ${(props) => `repeat(${props.rows}, minmax(44px, auto))`};
  column-gap: 1px;
  row-gap: 1px;
  background-color: #fff;
`;

const HeaderCell = styled.div`
  background: #eee;
  color: #4e4f53;
  font-size: 13px;
  font-weight: bold;
  padding: 0 10px;
  display: flex;
  align-items: center;
`;

const Cell = styled.div`
  background: #eee;
  color: #4e4f53;
  font-size: 13px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  word-break: break-word;
`;

const EmptyRow = styled.div`
  grid-column: 1 / 5;
  background: #eee;
  color: #8b8c90;
  font-size: 13px;
  padding: 10px;
  display: flex;
  align-items: center;
`;

const RowActions = styled.div`
  display: flex;
  gap: 6px;
`;

const ActionButton = styled.button<{ $danger?: boolean }>`
  border: 1px solid ${(props) => (props.$danger ? "#e4002b" : "#8a4d92")};
  background: transparent;
  color: ${(props) => (props.$danger ? "#e4002b" : "#8a4d92")};
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`;

export default AdminDepartmentsPage;
