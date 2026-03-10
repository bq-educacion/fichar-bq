import AdminSectionTabs from "@/components/AdminSectionTabs";
import getUserByEmail from "@/controllers/getUser";
import connectMongo from "@/lib/connectMongo";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  AdminManagedUser,
  AdminManagedUsersResponse,
  adminManagedUserSchema,
  adminManagedUsersResponseSchema,
} from "@/schemas/api";
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

const getUserDisplayName = (user: Pick<AdminManagedUser, "name" | "email">): string =>
  toCapitalizedWords(user.name.trim() || user.email);

const serializeEditableFields = (user: AdminManagedUser): string =>
  JSON.stringify({
    admin: user.admin,
    isManager: user.isManager,
    active: user.active,
    manager: user.manager ?? "",
  });

const buildBaselineById = (users: AdminManagedUsersResponse): Record<string, string> =>
  Object.fromEntries(users.map((user) => [user._id, serializeEditableFields(user)]));

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
  const [showAll, setShowAll] = useState(false);
  const [baselineById, setBaselineById] = useState<Record<string, string>>({});
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [rowErrorById, setRowErrorById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/admin/users?detailed=true${showAll ? "&includeInactive=true" : ""}`
        );

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        if (res.status === 403) {
          router.push("/");
          return;
        }

        if (!res.ok) {
          throw new Error((await res.text()) || "No se pudo cargar usuarios");
        }

        const data = adminManagedUsersResponseSchema.parse(await res.json());
        setUsers(data);
        setBaselineById(buildBaselineById(data));
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
    patch: Partial<Pick<AdminManagedUser, "admin" | "isManager" | "manager" | "active">>
  ) => {
    setUsers((prev) =>
      prev.map((user) => (user._id === userId ? { ...user, ...patch } : user))
    );
    setRowErrorById((prev) => {
      if (!prev[userId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const onSaveUser = async (userId: string) => {
    const user = users.find((item) => item._id === userId);
    if (!user) {
      return;
    }

    setSavingById((prev) => ({ ...prev, [userId]: true }));
    setError("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          _id: user._id,
          admin: user.admin,
          isManager: user.isManager,
          active: user.active,
          manager: user.manager ?? null,
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
        setBaselineById((prev) => {
          if (!prev[userId]) {
            return prev;
          }
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      } else {
        setUsers((prev) =>
          prev.map((item) => (item._id === userId ? updatedUser : item))
        );
        setBaselineById((prev) => ({
          ...prev,
          [userId]: serializeEditableFields(updatedUser),
        }));
      }
      setRowErrorById((prev) => {
        if (!prev[userId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (err) {
      setRowErrorById((prev) => ({
        ...prev,
        [userId]:
          err instanceof Error ? err.message : "No se pudo guardar usuario",
      }));
    } finally {
      setSavingById((prev) => ({ ...prev, [userId]: false }));
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
              estado activo por usuario.
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
                    <HeaderCell>Activo</HeaderCell>
                    <HeaderCell>Acciones</HeaderCell>
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
                    const isSaving = Boolean(savingById[user._id]);
                    const isDirty =
                      baselineById[user._id] !== serializeEditableFields(user);
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
                          <DataCell>
                            <SaveButton
                              onClick={() => onSaveUser(user._id)}
                              disabled={isSaving || !isDirty}
                            >
                              {isSaving ? "Guardando..." : "Guardar"}
                            </SaveButton>
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
  overflow-x: auto;
`;

const UsersTable = styled.table`
  width: 100%;
  min-width: 930px;
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
  min-width: 220px;
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #4e4f53;
  padding: 0 8px;
  font-size: 13px;
`;

const SaveButton = styled.button`
  border: none;
  border-radius: 4px;
  height: 36px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: bold;
  color: #fff;
  cursor: pointer;
  background-image: linear-gradient(256deg, #b68fbb, #ff5776);

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default AdminUsersPage;
