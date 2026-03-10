import getUserByEmail from "@/controllers/getUser";
import connectMongo from "@/lib/connectMongo";
import { AdminProjectsResponse, AdminUsersResponse, adminProjectsResponseSchema, adminUsersResponseSchema } from "@/schemas/api";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import AdminSectionTabs from "@/components/AdminSectionTabs";
import SimpleContainer from "@/ui/SimpleContainer";
import styled from "@emotion/styled";
import { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";

const ADMIN_PANEL_MAX_WIDTH = "980px";

const toCapitalizedWords = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");

const toInputDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const todayInput = () => toInputDate(new Date());

type ProjectFormState = {
  name: string;
  startDate: string;
  endData: string;
  user: string[];
};

const initialFormState = (): ProjectFormState => ({
  name: "",
  startDate: todayInput(),
  endData: todayInput(),
  user: [],
});

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

const AdminProjectsPage: NextPage = () => {
  const router = useRouter();

  const [projects, setProjects] = useState<AdminProjectsResponse>([]);
  const [users, setUsers] = useState<AdminUsersResponse>([]);
  const [form, setForm] = useState<ProjectFormState>(initialFormState);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const userNameById = useMemo(
    () =>
      new Map(
        users.map((user) => [user._id, user.name.trim() || user.email] as const)
      ),
    [users]
  );

  const availableUsers = useMemo(
    () =>
      users.filter(
        (user) => !user.departmentCostesGenerales && !form.user.includes(user._id)
      ),
    [users, form.user]
  );

  const visibleProjects = useMemo(() => {
    if (showAllProjects) {
      return projects;
    }

    const today = todayInput();
    return projects.filter((project) => {
      const startDate = toInputDate(project.startDate);
      const endDate = toInputDate(project.endData);
      return startDate <= today && endDate >= today;
    });
  }, [projects, showAllProjects]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const [projectsRes, usersRes] = await Promise.all([
          fetch("/api/admin/projects"),
          fetch("/api/admin/users"),
        ]);

        if (projectsRes.status === 401 || usersRes.status === 401) {
          router.push("/login");
          return;
        }

        if (projectsRes.status === 403 || usersRes.status === 403) {
          router.push("/");
          return;
        }

        if (!projectsRes.ok || !usersRes.ok) {
          const projectsError = !projectsRes.ok ? await projectsRes.text() : "";
          const usersError = !usersRes.ok ? await usersRes.text() : "";
          throw new Error(projectsError || usersError || "No se pudo cargar administración");
        }

        const projectsData = adminProjectsResponseSchema.parse(
          await projectsRes.json()
        );
        const usersData = adminUsersResponseSchema.parse(await usersRes.json());

        setProjects(projectsData);
        setUsers(usersData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("No se pudo cargar administración");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const resetForm = () => {
    setForm(initialFormState());
    setEditingId(null);
    setSelectedUserToAdd("");
  };

  const onAddUserToProject = () => {
    if (!selectedUserToAdd) {
      return;
    }

    const selectedUser = users.find((user) => user._id === selectedUserToAdd);
    if (selectedUser?.departmentCostesGenerales) {
      setError(
        "No puedes asignar a proyectos usuarios de departamentos de gastos generales"
      );
      setSelectedUserToAdd("");
      return;
    }

    setForm((prev) => {
      if (prev.user.includes(selectedUserToAdd)) {
        return prev;
      }

      return {
        ...prev,
        user: [...prev.user, selectedUserToAdd],
      };
    });

    setSelectedUserToAdd("");
  };

  const onRemoveUserFromProject = (userId: string) => {
    setForm((prev) => ({
      ...prev,
      user: prev.user.filter((id) => id !== userId),
    }));
  };

  const onSubmit = async () => {
    setSaving(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        startDate: form.startDate,
        endData: form.endData,
        user: form.user,
      };

      const isEditing = Boolean(editingId);

      const res = await fetch("/api/admin/projects", {
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
        throw new Error((await res.text()) || "No se pudo guardar el proyecto");
      }

      const refreshedProjects = adminProjectsResponseSchema.parse(
        await (await fetch("/api/admin/projects")).json()
      );
      setProjects(refreshedProjects);
      resetForm();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo guardar el proyecto");
      }
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (projectId: string) => {
    const project = projects.find((item) => item._id === projectId);
    if (!project) {
      return;
    }

    setEditingId(project._id);
    setForm({
      name: project.name,
      startDate: toInputDate(project.startDate),
      endData: toInputDate(project.endData),
      user: [...project.user],
    });
  };

  const onDelete = async (projectId: string) => {
    const confirmed = window.confirm("¿Eliminar este proyecto?");
    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const res = await fetch("/api/admin/projects", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ _id: projectId }),
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
        throw new Error((await res.text()) || "No se pudo eliminar el proyecto");
      }

      setProjects((prev) => prev.filter((project) => project._id !== projectId));

      if (editingId === projectId) {
        resetForm();
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo eliminar el proyecto");
      }
    }
  };

  return (
    <>
      <AdminSectionTabs active="projects" maxWidth={ADMIN_PANEL_MAX_WIDTH} />
      <SimpleContainer
        title="Administración · Proyectos"
        textColor="#4e4f53"
        fontSize="14px"
        height="40px"
        backgroundImage="linear-gradient(220deg, #eee, #eee)"
        maxWidth={ADMIN_PANEL_MAX_WIDTH}
      >
        <Content>
          <FormSection>
            <SectionTitle>
              {editingId ? "Editar proyecto" : "Nuevo proyecto"}
            </SectionTitle>

            <Field>
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del proyecto"
              />
            </Field>

            <Dates>
              <Field>
                <Label>Inicio</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </Field>
              <Field>
                <Label>Fin</Label>
                <Input
                  type="date"
                  value={form.endData}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endData: e.target.value }))
                  }
                />
              </Field>
            </Dates>

            <Field>
              <Label>Usuarios del proyecto</Label>
              <HelperText>
                Solo se pueden asignar usuarios que no pertenezcan a departamentos de
                gastos generales.
              </HelperText>
              <AddUserRow>
                <Select
                  value={selectedUserToAdd}
                  onChange={(e) => setSelectedUserToAdd(e.target.value)}
                >
                  <option value="">Selecciona usuario</option>
                  {availableUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {toCapitalizedWords(user.name || user.email)}
                    </option>
                  ))}
                </Select>
                <SmallButton onClick={onAddUserToProject}>Añadir</SmallButton>
              </AddUserRow>

              <SelectedUsers>
                {form.user.length === 0 ? (
                  <EmptyText>Sin usuarios asignados</EmptyText>
                ) : (
                  form.user.map((userId) => (
                    <UserChip key={userId}>
                      <span>{toCapitalizedWords(userNameById.get(userId) || userId)}</span>
                      <RemoveChipButton onClick={() => onRemoveUserFromProject(userId)}>
                        ✕
                      </RemoveChipButton>
                    </UserChip>
                  ))
                )}
              </SelectedUsers>
            </Field>

            <Actions>
              <PrimaryButton onClick={onSubmit} disabled={saving}>
                {saving
                  ? "Guardando..."
                  : editingId
                    ? "Guardar cambios"
                    : "Crear proyecto"}
              </PrimaryButton>
              {editingId && (
                <SecondaryButton onClick={resetForm}>Cancelar edición</SecondaryButton>
              )}
            </Actions>

            {error && <ErrorText>{error}</ErrorText>}
          </FormSection>

          <ListSection>
            <ListHeaderRow>
              <SectionTitle>Proyectos</SectionTitle>
              <ToggleAllButton onClick={() => setShowAllProjects((prev) => !prev)}>
                {showAllProjects ? "Mostrar solo activos" : "Mostrar todos"}
              </ToggleAllButton>
            </ListHeaderRow>

            {loading ? (
              <LoadingText>Cargando proyectos...</LoadingText>
            ) : (
              <TableScroll>
                <ProjectsTable rows={Math.max(visibleProjects.length, 1)}>
                  <HeaderCell>Nombre</HeaderCell>
                  <HeaderCell>Inicio</HeaderCell>
                  <HeaderCell>Fin</HeaderCell>
                  <HeaderCell>Usuarios</HeaderCell>
                  <HeaderCell>Acciones</HeaderCell>

                  {visibleProjects.length === 0 ? (
                    <EmptyRow>
                      {showAllProjects ? "Sin proyectos todavía" : "Sin proyectos activos"}
                    </EmptyRow>
                  ) : (
                    visibleProjects.map((project) => (
                      <React.Fragment key={project._id}>
                        <Cell>{project.name}</Cell>
                        <Cell>{toInputDate(project.startDate)}</Cell>
                        <Cell>{toInputDate(project.endData)}</Cell>
                        <Cell>
                          {project.user.length === 0
                            ? "-"
                            : project.user
                                .map((userId) => userNameById.get(userId) || userId)
                                .join(", ")}
                        </Cell>
                        <Cell>
                          <RowActions>
                            <ActionButton onClick={() => onEdit(project._id)}>
                              Editar
                            </ActionButton>
                            <ActionButton $danger onClick={() => onDelete(project._id)}>
                              Eliminar
                            </ActionButton>
                          </RowActions>
                        </Cell>
                      </React.Fragment>
                    ))
                  )}
                </ProjectsTable>
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

const ListHeaderRow = styled.div`
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

const SectionTitle = styled.div`
  font-size: 14px;
  font-weight: bold;
  color: #4e4f53;
`;

const ToggleAllButton = styled.button`
  border: 1px solid #c9c9c9;
  border-radius: 4px;
  height: 34px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #4e4f53;
  background: #fff;
  cursor: pointer;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const HelperText = styled.div`
  font-size: 12px;
  color: #6d6e72;
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

const Dates = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const AddUserRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const Select = styled.select`
  height: 38px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  padding: 0 10px;
  font-size: 14px;
  color: #4e4f53;
`;

const SmallButton = styled.button`
  border: none;
  border-radius: 4px;
  height: 38px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: bold;
  color: #fff;
  cursor: pointer;
  background-image: linear-gradient(256deg, #b68fbb, #ff5776);
`;

const SelectedUsers = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const UserChip = styled.div`
  height: 32px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 16px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4e4f53;
  font-size: 13px;
`;

const RemoveChipButton = styled.button`
  border: none;
  background: transparent;
  color: #8a4d92;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
`;

const EmptyText = styled.div`
  font-size: 13px;
  color: #8b8c90;
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

const ProjectsTable = styled.div<{ rows: number }>`
  width: 100%;
  min-width: 860px;
  display: grid;
  grid-template-columns: 1.8fr 0.9fr 0.9fr 2fr 1.2fr;
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
  grid-column: 1 / 6;
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

export default AdminProjectsPage;
