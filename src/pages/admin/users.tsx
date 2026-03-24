import AdminSectionTabs from "@/components/AdminSectionTabs";
import getUserByEmail from "@/controllers/getUser";
import {
  buildAdminUsersRequestPath,
  canUseSalaryVisibilityToggle,
  formatSalaryForDisplay,
  formatSalaryForInput,
  getTodayDateForInput,
  getSalaryToggleLabel,
  parseSalaryInput,
} from "@/lib/adminUsers";
import connectMongo from "@/lib/connectMongo";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  AdminDepartmentOptionsResponse,
  AdminManagedUser,
  AdminManagedUsersResponse,
  adminDepartmentOptionsResponseSchema,
  adminDepartmentsResponseSchema,
  adminManagedUserSchema,
  adminManagedUsersResponseSchema,
  adminUserSalaryResponseSchema,
} from "@/schemas/api";
import SimpleContainer from "@/ui/SimpleContainer";
import styled from "@emotion/styled";
import { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const ADMIN_PANEL_MAX_WIDTH = "1320px";

const toCapitalizedWords = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");

const getUserDisplayName = (user: Pick<AdminManagedUser, "name" | "email">): string =>
  toCapitalizedWords(user.name.trim() || user.email);

type AdminUsersPageProps = {
  isSuperadmin: boolean;
};

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
      isSuperadmin: Boolean(user.superadmin),
    },
  };
};

const AdminUsersPage: NextPage<AdminUsersPageProps> = ({ isSuperadmin }) => {
  const router = useRouter();

  const [users, setUsers] = useState<AdminManagedUsersResponse>([]);
  const [departments, setDepartments] = useState<AdminDepartmentOptionsResponse>([]);
  const [showAll, setShowAll] = useState(false);
  const [showSalaries, setShowSalaries] = useState(false);
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [salarySavingById, setSalarySavingById] = useState<Record<string, boolean>>(
    {}
  );
  const [salaryLoadingById, setSalaryLoadingById] = useState<Record<string, boolean>>(
    {}
  );
  const [rowErrorById, setRowErrorById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [salaryEditorUserId, setSalaryEditorUserId] = useState<string | null>(null);
  const [salaryDraft, setSalaryDraft] = useState("");
  const [salaryInitDateDraft, setSalaryInitDateDraft] = useState("");
  const pendingSaveById = useRef<Record<string, AdminManagedUser | undefined>>({});
  const inFlightSaveById = useRef<Record<string, boolean>>({});
  const usersByIdRef = useRef<Record<string, AdminManagedUser>>({});
  const columnCount = isSuperadmin ? 8 : 6;

  const stripSalaryFields = useCallback(
    (items: AdminManagedUsersResponse): AdminManagedUsersResponse =>
      items.map((user) => {
        if (user.salary === undefined) {
          return user;
        }

        const { salary, ...rest } = user;
        return rest;
      }),
    []
  );

  const managerOptions = useMemo(
    () => users.filter((user) => user.active && user.isManager),
    [users]
  );

  const userNameByEmail = useMemo(
    () =>
      new Map(
        users.map((user) => [user.email, getUserDisplayName(user)] as const)
      ),
    [users]
  );

  const departmentNameById = useMemo(
    () =>
      new Map(
        departments.map((department) => [department._id, department.name] as const)
      ),
    [departments]
  );

  useEffect(() => {
    usersByIdRef.current = Object.fromEntries(
      users.map((user) => [user._id, user] as const)
    );
  }, [users]);

  const replaceUserInState = (updatedUser: AdminManagedUser) => {
    usersByIdRef.current[updatedUser._id] = updatedUser;
    setUsers((prev) =>
      prev.map((item) => (item._id === updatedUser._id ? updatedUser : item))
    );
  };

  const closeSalaryEditor = useCallback(() => {
    setSalaryEditorUserId(null);
    setSalaryDraft("");
    setSalaryInitDateDraft("");
  }, []);

  const clearSalaryState = useCallback(() => {
    setShowSalaries(false);
    closeSalaryEditor();
    setUsers((prev) => stripSalaryFields(prev));
  }, [closeSalaryEditor, stripSalaryFields]);

  const persistUser = (nextUser: AdminManagedUser) => {
    pendingSaveById.current[nextUser._id] = nextUser;

    if (inFlightSaveById.current[nextUser._id]) {
      return;
    }

    const flushSaves = async (userId: string) => {
      inFlightSaveById.current[userId] = true;
      setSavingById((prev) => ({ ...prev, [userId]: true }));

      try {
        while (pendingSaveById.current[userId]) {
          const userToSave = pendingSaveById.current[userId];
          pendingSaveById.current[userId] = undefined;

          if (!userToSave) {
            break;
          }

          const res = await fetch("/api/admin/users", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              _id: userToSave._id,
              admin: userToSave.admin,
              ...(typeof userToSave.superadmin === "boolean"
                ? { superadmin: userToSave.superadmin }
                : {}),
              isManager: userToSave.isManager,
              active: userToSave.active,
              manager: userToSave.manager ?? null,
              department: userToSave.department ?? null,
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
            throw new Error((await res.text()) || "No se pudo guardar usuario");
          }

          const parsedUser = adminManagedUserSchema.parse(await res.json());
          const updatedUser: AdminManagedUser = {
            ...parsedUser,
            ...(parsedUser.superadmin === undefined &&
            typeof userToSave.superadmin === "boolean"
              ? { superadmin: userToSave.superadmin }
              : {}),
            ...(parsedUser.salary === undefined && userToSave.salary !== undefined
              ? { salary: userToSave.salary }
              : {}),
          };
          if (!showAll && !updatedUser.active) {
            setUsers((prev) => prev.filter((item) => item._id !== userId));
            delete usersByIdRef.current[userId];
            pendingSaveById.current[userId] = undefined;
          } else {
            replaceUserInState(updatedUser);
          }

          setRowErrorById((prev) => {
            if (!prev[userId]) {
              return prev;
            }
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }
      } catch (err) {
        setRowErrorById((prev) => ({
          ...prev,
          [userId]:
            err instanceof Error ? err.message : "No se pudo guardar usuario",
        }));
      } finally {
        inFlightSaveById.current[userId] = false;
        setSavingById((prev) => ({ ...prev, [userId]: false }));

        if (pendingSaveById.current[userId]) {
          void flushSaves(userId);
        }
      }
    };

    void flushSaves(nextUser._id);
  };

  const clearRowError = (userId: string) => {
    setRowErrorById((prev) => {
      if (!prev[userId]) {
        return prev;
      }

      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const loadSalary = async (userId: string): Promise<number | null | undefined> => {
    const currentUser = usersByIdRef.current[userId];
    if (!currentUser) {
      return undefined;
    }

    if (currentUser.salary !== undefined) {
      return currentUser.salary;
    }

    setSalaryLoadingById((prev) => ({ ...prev, [userId]: true }));

    try {
      const res = await fetch(`/api/admin/users/salary?userId=${userId}`, {
        cache: "no-store",
      });

      if (res.status === 401) {
        clearSalaryState();
        router.push("/login");
        return undefined;
      }

      if (res.status === 403) {
        clearSalaryState();
        router.push("/");
        return undefined;
      }

      if (!res.ok) {
        throw new Error((await res.text()) || "No se pudo cargar el salario");
      }

      const salaryData = adminUserSalaryResponseSchema.parse(await res.json());
      replaceUserInState({
        ...currentUser,
        salary: salaryData.salary,
      });
      clearRowError(userId);
      return salaryData.salary;
    } catch (err) {
      setRowErrorById((prev) => ({
        ...prev,
        [userId]:
          err instanceof Error ? err.message : "No se pudo cargar el salario",
      }));
      return undefined;
    } finally {
      setSalaryLoadingById((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const openSalaryEditor = async (userId: string) => {
    if (salaryEditorUserId === userId) {
      closeSalaryEditor();
      return;
    }

    const currentUser = usersByIdRef.current[userId];
    if (!currentUser) {
      return;
    }

    const salary =
      currentUser.salary !== undefined ? currentUser.salary : await loadSalary(userId);
    if (salary === undefined) {
      return;
    }

    setSalaryDraft(formatSalaryForInput(salary));
    setSalaryInitDateDraft(getTodayDateForInput());
    setSalaryEditorUserId(userId);
  };

  const toggleSalaryVisibility = () => {
    if (showSalaries) {
      closeSalaryEditor();
      setUsers((prev) => stripSalaryFields(prev));
    }

    setShowSalaries((prev) => !prev);
  };

  const saveSalary = async (userId: string) => {
    const salary = parseSalaryInput(salaryDraft);
    if (salary === undefined) {
      setRowErrorById((prev) => ({
        ...prev,
        [userId]: "Introduce un salario válido",
      }));
      return;
    }

    if (!salaryInitDateDraft) {
      setRowErrorById((prev) => ({
        ...prev,
        [userId]: "Selecciona una fecha de inicio",
      }));
      return;
    }

    setSalarySavingById((prev) => ({ ...prev, [userId]: true }));

    try {
      const res = await fetch("/api/admin/users/salary", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          _id: userId,
          salary,
          initDate: salaryInitDateDraft,
        }),
      });

      if (res.status === 401) {
        clearSalaryState();
        router.push("/login");
        return;
      }

      if (res.status === 403) {
        clearSalaryState();
        router.push("/");
        return;
      }

      if (!res.ok) {
        throw new Error((await res.text()) || "No se pudo guardar el salario");
      }

      const salaryData = adminUserSalaryResponseSchema.parse(await res.json());
      const currentUser = usersByIdRef.current[userId];
      if (currentUser) {
        replaceUserInState({
          ...currentUser,
          salary: salaryData.salary,
        });
      }

      clearRowError(userId);
      closeSalaryEditor();
    } catch (err) {
      setRowErrorById((prev) => ({
        ...prev,
        [userId]:
          err instanceof Error ? err.message : "No se pudo guardar el salario",
      }));
    } finally {
      setSalarySavingById((prev) => ({ ...prev, [userId]: false }));
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");

      try {
        const [usersRes, departmentsRes] = await Promise.all([
          fetch(
            buildAdminUsersRequestPath({
              showAll,
              showSalaries,
              isSuperadmin,
            }),
            {
              cache: "no-store",
            }
          ),
          fetch("/api/admin/departments", {
            cache: "no-store",
          }),
        ]);

        if (usersRes.status === 401 || departmentsRes.status === 401) {
          clearSalaryState();
          router.push("/login");
          return;
        }

        if (usersRes.status === 403 || departmentsRes.status === 403) {
          clearSalaryState();
          router.push("/");
          return;
        }

        if (!usersRes.ok || !departmentsRes.ok) {
          const usersError = !usersRes.ok ? await usersRes.text() : "";
          const departmentsError = !departmentsRes.ok
            ? await departmentsRes.text()
            : "";
          throw new Error(
            usersError || departmentsError || "No se pudo cargar usuarios"
          );
        }

        const usersData = adminManagedUsersResponseSchema.parse(await usersRes.json());
        const fullDepartments = adminDepartmentsResponseSchema.parse(
          await departmentsRes.json()
        );
        const departmentData = adminDepartmentOptionsResponseSchema.parse(
          fullDepartments.map((department) => ({
            _id: department._id,
            name: department.name,
          }))
        );
        setUsers(usersData);
        setDepartments(departmentData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("No se pudo cargar usuarios");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [clearSalaryState, isSuperadmin, router, showAll, showSalaries]);

  const onUserChange = (
    userId: string,
    patch: Partial<
      Pick<
        AdminManagedUser,
        "admin" | "superadmin" | "isManager" | "manager" | "active" | "department"
      >
    >
  ) => {
    const currentUser = usersByIdRef.current[userId];
    if (!currentUser) {
      return;
    }

    const nextUser: AdminManagedUser = {
      ...currentUser,
      ...patch,
    };

    replaceUserInState(nextUser);
    clearRowError(userId);

    persistUser(nextUser);
  };

  return (
    <>
      <AdminSectionTabs active="users" maxWidth={ADMIN_PANEL_MAX_WIDTH} />
      <SimpleContainer
        title="Administración · Usuarios"
        textColor="#4e4f53"
        fontSize="14px"
        height="40px"
        backgroundImage="linear-gradient(220deg, #eee, #eee)"
        maxWidth={ADMIN_PANEL_MAX_WIDTH}
      >
        <Content>
          <TopRow>
            <IntroText>
              Configura permisos de administración, rol manager, responsable y
              estado activo por usuario. También puedes asignar departamento
              {isSuperadmin ? " y gestionar salarios cifrados." : "."}
            </IntroText>
            <ActionsRow>
              {canUseSalaryVisibilityToggle(isSuperadmin) && (
                <SalaryVisibilityControl>
                  <ToggleGroupLabel>Salarios</ToggleGroupLabel>
                  <SalaryVisibilityToggle
                    type="button"
                    role="switch"
                    aria-checked={showSalaries}
                    aria-label={getSalaryToggleLabel(showSalaries)}
                    title={getSalaryToggleLabel(showSalaries)}
                    $checked={showSalaries}
                    onClick={toggleSalaryVisibility}
                  >
                    <SalaryVisibilityOption $active={!showSalaries}>
                      Ocultos
                    </SalaryVisibilityOption>
                    <SalaryVisibilityOption $active={showSalaries}>
                      Visibles
                    </SalaryVisibilityOption>
                  </SalaryVisibilityToggle>
                </SalaryVisibilityControl>
              )}
              <ToggleAllButton onClick={() => setShowAll((prev) => !prev)}>
                {showAll ? "Mostrar solo activos" : "Mostrar todos"}
              </ToggleAllButton>
            </ActionsRow>
          </TopRow>
          {error && <ErrorText>{error}</ErrorText>}
          {loading ? (
            <LoadingText>Cargando usuarios...</LoadingText>
          ) : users.length === 0 ? (
            <EmptyText>No hay usuarios registrados</EmptyText>
          ) : (
            <TableScroll>
              <UsersTable>
                <thead>
                  <tr>
                    <HeaderCell>Usuario</HeaderCell>
                    <HeaderCell>Admin</HeaderCell>
                    {isSuperadmin && <HeaderCell>Superadmin</HeaderCell>}
                    <HeaderCell>Manager</HeaderCell>
                    <HeaderCell>Responsable</HeaderCell>
                    <HeaderCell>Departamento</HeaderCell>
                    <HeaderCell>Activo</HeaderCell>
                    {isSuperadmin && <HeaderCell>Salario</HeaderCell>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const userName = getUserDisplayName(user);
                    const availableManagers = managerOptions.filter(
                      (manager) => manager._id !== user._id
                    );
                    const managerExists = Boolean(
                      user.manager &&
                        availableManagers.some(
                          (manager) => manager.email === user.manager
                        )
                    );
                    const departmentExists = Boolean(
                      user.department &&
                        departments.some(
                          (department) => department._id === user.department
                        )
                    );
                    const isSaving = Boolean(savingById[user._id]);
                    const isSalaryLoading = Boolean(salaryLoadingById[user._id]);
                    const isSalarySaving = Boolean(salarySavingById[user._id]);
                    const isSalaryBusy = Boolean(
                      isSalarySaving || isSalaryLoading
                    );
                    const rowError = rowErrorById[user._id];

                    return (
                      <React.Fragment key={user._id}>
                        <tr>
                          <DataCell>
                            <UserName>{userName}</UserName>
                            <UserEmail>{user.email}</UserEmail>
                          </DataCell>
                          <DataCell>
                            <Centered>
                              <Toggle
                                type="checkbox"
                                checked={user.admin}
                                disabled={isSaving}
                                aria-label={`Admin ${userName}`}
                                onChange={(event) => {
                                  const nextAdmin = event.target.checked;
                                  onUserChange(user._id, {
                                    admin: nextAdmin,
                                    ...(user.superadmin && !nextAdmin
                                      ? { superadmin: false }
                                      : {}),
                                  });
                                }}
                              />
                            </Centered>
                          </DataCell>
                          {isSuperadmin && (
                            <DataCell>
                              <Centered>
                                <Toggle
                                  type="checkbox"
                                  checked={Boolean(user.superadmin)}
                                  disabled={isSaving || !user.admin}
                                  aria-label={`Superadmin ${userName}`}
                                  onChange={(event) =>
                                    onUserChange(user._id, {
                                      superadmin: event.target.checked,
                                    })
                                  }
                                />
                              </Centered>
                            </DataCell>
                          )}
                          <DataCell>
                            <Centered>
                              <Toggle
                                type="checkbox"
                                checked={user.isManager}
                                disabled={isSaving}
                                aria-label={`Manager ${userName}`}
                                onChange={(event) =>
                                  onUserChange(user._id, {
                                    isManager: event.target.checked,
                                  })
                                }
                              />
                            </Centered>
                          </DataCell>
                          <DataCell>
                            <ManagerSelect
                              value={user.manager ?? ""}
                              disabled={isSaving}
                              aria-label={`Responsable ${userName}`}
                              onChange={(event) =>
                                onUserChange(user._id, {
                                  manager: event.target.value || undefined,
                                })
                              }
                            >
                              <option value="">Sin responsable</option>
                              {availableManagers.map((manager) => (
                                <option key={manager._id} value={manager.email}>
                                  {getUserDisplayName(manager)}
                                </option>
                              ))}
                              {user.manager && !managerExists && (
                                <option value={user.manager}>
                                  {(userNameByEmail.get(user.manager) || user.manager)
                                    .toString()
                                    .trim()}{" "}
                                  (no disponible)
                                </option>
                              )}
                            </ManagerSelect>
                          </DataCell>
                          <DataCell>
                            <DepartmentSelect
                              value={user.department ?? ""}
                              disabled={isSaving}
                              aria-label={`Departamento ${userName}`}
                              onChange={(event) =>
                                onUserChange(user._id, {
                                  department: event.target.value || undefined,
                                })
                              }
                            >
                              <option value="">Sin departamento</option>
                              {departments.map((department) => (
                                <option key={department._id} value={department._id}>
                                  {department.name}
                                </option>
                              ))}
                              {user.department && !departmentExists && (
                                <option value={user.department}>
                                  {(departmentNameById.get(user.department) ||
                                    user.department)
                                    .toString()
                                    .trim()}{" "}
                                  (no disponible)
                                </option>
                              )}
                            </DepartmentSelect>
                          </DataCell>
                          <DataCell>
                            <Centered>
                              <Toggle
                                type="checkbox"
                                checked={user.active}
                                disabled={isSaving}
                                aria-label={`Activo ${userName}`}
                                onChange={(event) =>
                                  onUserChange(user._id, {
                                    active: event.target.checked,
                                  })
                                }
                              />
                            </Centered>
                          </DataCell>
                          {isSuperadmin && (
                            <DataCell>
                              <SalaryCell>
                                {showSalaries ? (
                                  <SalaryValueButton
                                    type="button"
                                    disabled={isSaving || isSalaryBusy}
                                    onClick={() => void openSalaryEditor(user._id)}
                                    title={
                                      user.salary === null
                                        ? "Definir salario"
                                        : "Editar salario"
                                    }
                                  >
                                    {isSalaryLoading
                                      ? "Cargando..."
                                      : isSalarySaving
                                      ? "Guardando..."
                                      : formatSalaryForDisplay(user.salary)}
                                  </SalaryValueButton>
                                ) : (
                                  <SalaryHiddenValue>Oculto</SalaryHiddenValue>
                                )}
                              </SalaryCell>
                            </DataCell>
                          )}
                        </tr>
                        {isSuperadmin && salaryEditorUserId === user._id && (
                          <tr>
                            <EditorCell colSpan={columnCount}>
                              <SalaryEditorForm
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void saveSalary(user._id);
                                }}
                              >
                                <SalaryInput
                                  type="text"
                                  inputMode="decimal"
                                  value={salaryDraft}
                                  disabled={isSalaryBusy}
                                  aria-label={`Salario ${userName}`}
                                  placeholder="Ej. 24500.50"
                                  onChange={(event) =>
                                    setSalaryDraft(event.target.value)
                                  }
                                />
                                <DateInput
                                  type="date"
                                  value={salaryInitDateDraft}
                                  disabled={isSalaryBusy}
                                  aria-label={`Fecha salario ${userName}`}
                                  onChange={(event) =>
                                    setSalaryInitDateDraft(event.target.value)
                                  }
                                />
                                <SalaryFormActions>
                                  <SalaryButton
                                    type="submit"
                                    disabled={isSalaryBusy}
                                  >
                                    Guardar salario
                                  </SalaryButton>
                                  <SecondaryActionButton
                                    type="button"
                                    disabled={isSalaryBusy}
                                    onClick={closeSalaryEditor}
                                  >
                                    Cancelar
                                  </SecondaryActionButton>
                                </SalaryFormActions>
                              </SalaryEditorForm>
                            </EditorCell>
                          </tr>
                        )}
                        {rowError && (
                          <tr>
                            <RowErrorCell colSpan={columnCount}>
                              {rowError}
                            </RowErrorCell>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </UsersTable>
            </TableScroll>
          )}
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
  padding: 16px;
  box-sizing: border-box;
`;

const IntroText = styled.div`
  font-size: 14px;
  color: #4e4f53;
`;

const TopRow = styled.div`
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

const ActionsRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const SalaryVisibilityControl = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ToggleGroupLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #4e4f53;
`;

const SalaryVisibilityToggle = styled.button<{ $checked: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  width: 176px;
  height: 38px;
  padding: 4px;
  border: 1px solid #cbd3df;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffffff 0%, #f1f4f8 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::before {
    content: "";
    position: absolute;
    top: 4px;
    left: ${({ $checked }) => ($checked ? "calc(50% + 2px)" : "4px")};
    width: calc(50% - 6px);
    height: calc(100% - 8px);
    border-radius: 999px;
    background: linear-gradient(180deg, #4e4f53 0%, #3d3f43 100%);
    box-shadow: 0 8px 18px rgba(78, 79, 83, 0.2);
    transition: left 0.2s ease;
  }

  &:focus-visible {
    outline: none;
    border-color: #7a8ca4;
    box-shadow: 0 0 0 3px rgba(122, 140, 164, 0.22);
  }
`;

const SalaryVisibilityOption = styled.span<{ $active: boolean }>`
  position: relative;
  z-index: 1;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $active }) => ($active ? "#ffffff" : "#6d7682")};
  transition: color 0.2s ease;
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

const LoadingText = styled.div`
  font-size: 14px;
  color: #4e4f53;
  padding: 8px 0;
`;

const EmptyText = styled.div`
  font-size: 14px;
  color: #8b8c90;
  padding: 8px 0;
`;

const ErrorText = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #b00020;
  margin-bottom: 8px;
`;

const TableScroll = styled.div`
  width: 100%;
  overflow-x: visible;
`;

const UsersTable = styled.table`
  width: 100%;
  min-width: 0;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 1px;
  background: #fff;
`;

const HeaderCell = styled.th`
  background: #eee;
  color: #4e4f53;
  font-size: 13px;
  font-weight: bold;
  text-align: left;
  padding: 10px;
  white-space: nowrap;
`;

const DataCell = styled.td`
  background: #eee;
  color: #4e4f53;
  font-size: 13px;
  padding: 8px 10px;
  vertical-align: middle;
`;

const RowErrorCell = styled.td`
  background: #eee;
  color: #b00020;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 10px;
`;

const EditorCell = styled.td`
  background: #eee;
  padding: 12px 10px;
`;

const UserName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #4e4f53;
`;

const UserEmail = styled.div`
  font-size: 12px;
  color: #6d6e72;
  margin-top: 2px;
`;

const Centered = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Toggle = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

const SalaryCell = styled.div`
  display: flex;
  align-items: flex-start;
`;

const SalaryValueButton = styled.button`
  border: 0;
  padding: 0;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: #2d5a7a;
  cursor: pointer;
  border-bottom: 1px dashed transparent;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    opacity 0.2s ease;

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    color: #1f4560;
    border-color: currentColor;
    outline: none;
  }

  &:disabled {
    color: #8b8c90;
    cursor: wait;
    opacity: 0.85;
  }
`;

const SalaryHiddenValue = styled.div`
  font-size: 13px;
  color: #8b8c90;
`;

const SalaryEditorForm = styled.form`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
`;

const SalaryInput = styled.input`
  width: 180px;
  max-width: 100%;
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #4e4f53;
  padding: 0 10px;
  font-size: 13px;
`;

const DateInput = styled(SalaryInput)`
  width: 170px;
`;

const SalaryFormActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const SalaryButton = styled.button`
  border: 1px solid #c9c9c9;
  border-radius: 4px;
  min-height: 34px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #4e4f53;
  background: #fff;
  cursor: pointer;
`;

const SecondaryActionButton = styled(SalaryButton)`
  color: #6d6e72;
`;

const ManagerSelect = styled.select`
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #4e4f53;
  padding: 0 8px;
  font-size: 13px;
`;

const DepartmentSelect = styled.select`
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #4e4f53;
  padding: 0 8px;
  font-size: 13px;
`;

export default AdminUsersPage;
