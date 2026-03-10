import AdminSectionTabs from "@/components/AdminSectionTabs";
import getUserByEmail from "@/controllers/getUser";
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
} from "@/schemas/api";
import SimpleContainer from "@/ui/SimpleContainer";
import styled from "@emotion/styled";
import { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useRef, useState } from "react";

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

const AdminUsersPage: NextPage = () => {
  const router = useRouter();

  const [users, setUsers] = useState<AdminManagedUsersResponse>([]);
  const [departments, setDepartments] = useState<AdminDepartmentOptionsResponse>([]);
  const [showAll, setShowAll] = useState(false);
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [rowErrorById, setRowErrorById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pendingSaveById = useRef<Record<string, AdminManagedUser | undefined>>({});
  const inFlightSaveById = useRef<Record<string, boolean>>({});

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

          const updatedUser = adminManagedUserSchema.parse(await res.json());
          if (!showAll && !updatedUser.active) {
            setUsers((prev) => prev.filter((item) => item._id !== userId));
            pendingSaveById.current[userId] = undefined;
          } else {
            setUsers((prev) =>
              prev.map((item) => (item._id === userId ? updatedUser : item))
            );
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

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");

      try {
        const [usersRes, departmentsRes] = await Promise.all([
          fetch(
            `/api/admin/users?detailed=true${showAll ? "&includeInactive=true" : ""}`
          ),
          fetch("/api/admin/departments"),
        ]);

        if (usersRes.status === 401 || departmentsRes.status === 401) {
          router.push("/login");
          return;
        }

        if (usersRes.status === 403 || departmentsRes.status === 403) {
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
  }, [router, showAll]);

  const onUserChange = (
    userId: string,
    patch: Partial<
      Pick<AdminManagedUser, "admin" | "isManager" | "manager" | "active" | "department">
    >
  ) => {
    let nextUser: AdminManagedUser | null = null;
    setUsers((prev) =>
      prev.map((user) => {
        if (user._id !== userId) {
          return user;
        }

        const updatedUser: AdminManagedUser = {
          ...user,
          ...patch,
        };
        nextUser = updatedUser;
        return updatedUser;
      })
    );
    setRowErrorById((prev) => {
      if (!prev[userId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    if (nextUser) {
      persistUser(nextUser);
    }
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
              estado activo por usuario. También puedes asignar departamento.
            </IntroText>
            <ToggleAllButton onClick={() => setShowAll((prev) => !prev)}>
              {showAll ? "Mostrar solo activos" : "Mostrar todos"}
            </ToggleAllButton>
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
                    <HeaderCell>Manager</HeaderCell>
                    <HeaderCell>Responsable</HeaderCell>
                    <HeaderCell>Departamento</HeaderCell>
                    <HeaderCell>Activo</HeaderCell>
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
                                onChange={(event) =>
                                  onUserChange(user._id, {
                                    admin: event.target.checked,
                                  })
                                }
                              />
                            </Centered>
                          </DataCell>
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
                        </tr>
                        {rowError && (
                          <tr>
                            <RowErrorCell colSpan={6}>{rowError}</RowErrorCell>
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
