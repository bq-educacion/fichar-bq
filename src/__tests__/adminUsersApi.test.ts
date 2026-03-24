import { DepartmentModel, ProjectModel, UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import adminUsersHandler from "@/pages/api/admin/users";
import adminUserSalaryHandler from "@/pages/api/admin/users/salary";
import { encryptSalary } from "@/lib/userSalary";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";

jest.mock("@/pages/api/auth/[...nextauth]", () => ({
  authOptions: {},
}));
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));
jest.mock("@/lib/connectMongo", () => jest.fn());
jest.mock("@/db/Models", () => ({
  DepartmentModel: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
  },
  ProjectModel: {
    updateMany: jest.fn(),
  },
  UserModel: {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

type MockRequest = Partial<NextApiRequest> & {
  method?: NextApiRequest["method"];
  body?: unknown;
  query?: NextApiRequest["query"];
};

type MockResponse = {
  statusCode: number;
  body: unknown;
  setHeader: jest.MockedFunction<
    (name: string, value: number | string | readonly string[]) => MockResponse
  >;
  status: jest.MockedFunction<(code: number) => MockResponse>;
  json: jest.MockedFunction<(payload: unknown) => MockResponse>;
  send: jest.MockedFunction<(payload: unknown) => MockResponse>;
  end: jest.MockedFunction<() => MockResponse>;
};

type FindQuery<T> = {
  collation: jest.Mock<FindQuery<T>, [Record<string, unknown>]>;
  sort: jest.Mock<FindQuery<T>, [Record<string, 1 | -1>]>;
  select: jest.Mock<FindQuery<T>, [string]>;
  exec: jest.Mock<Promise<T>, []>;
};

type FindByIdQuery<T> = {
  select: jest.Mock<FindByIdQuery<T>, [string]>;
  exec: jest.Mock<Promise<T>, []>;
};

type ExecQuery<T> = {
  exec: jest.Mock<Promise<T>, []>;
};

type MockUserFields = {
  admin: boolean;
  superadmin: boolean;
  legal: boolean;
  email: string;
};

type MockManagedUserDoc = {
  _id: string;
  email: string;
  name: string;
  admin: boolean;
  superadmin: boolean;
  isManager: boolean;
  active: boolean;
  manager?: string;
  department?: string;
  salaryHistory?: Array<{
    initDate: Date;
    valueEncrypted: string;
  }>;
  save: jest.Mock<Promise<void>, []>;
  get: jest.Mock<unknown, [string]>;
  set: jest.Mock<void, [string, unknown]>;
};

const createMockResponse = (): MockResponse => {
  const response = {
    statusCode: 200,
    body: undefined,
  } as MockResponse;

  response.status = jest.fn().mockImplementation((code: number) => {
    response.statusCode = code;
    return response;
  });
  response.setHeader = jest.fn().mockImplementation(() => response);
  response.json = jest.fn().mockImplementation((payload: unknown) => {
    response.body = payload;
    return response;
  });
  response.send = jest.fn().mockImplementation((payload: unknown) => {
    response.body = payload;
    return response;
  });
  response.end = jest.fn().mockImplementation(() => response);

  return response;
};

const makeFindQuery = <T>(result: T): FindQuery<T> => {
  const query = {} as FindQuery<T>;
  query.collation = jest.fn().mockReturnValue(query);
  query.sort = jest.fn().mockReturnValue(query);
  query.select = jest.fn().mockReturnValue(query);
  query.exec = jest.fn().mockResolvedValue(result);
  return query;
};

const makeFindByIdQuery = <T>(result: T): FindByIdQuery<T> => {
  const query = {} as FindByIdQuery<T>;
  query.select = jest.fn().mockReturnValue(query);
  query.exec = jest.fn().mockResolvedValue(result);
  return query;
};

const makeExecQuery = <T>(result: T): ExecQuery<T> => ({
  exec: jest.fn().mockResolvedValue(result),
});

const toApiRequest = (request: MockRequest): NextApiRequest =>
  request as NextApiRequest;

const toApiResponse = (response: MockResponse): NextApiResponse =>
  response as unknown as NextApiResponse;

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  expires: "2099-01-01T00:00:00.000Z",
  ...overrides,
  user: {
    email: "admin@example.com",
    ...overrides.user,
  },
});

const createMockUser = (
  overrides: Partial<MockUserFields> = {}
): MockUserFields =>
  ({
    admin: true,
    superadmin: true,
    legal: true,
    email: "admin@example.com",
    ...overrides,
  });

const createSalaryHistoryEntry = (salary: number, initDate: string) => ({
  initDate: new Date(`${initDate}T00:00:00.000Z`),
  valueEncrypted: encryptSalary(salary),
});

const createManagedUserDoc = (
  overrides: Partial<MockManagedUserDoc> = {}
): MockManagedUserDoc => {
  const user = {
    _id: "507f191e810c19729de860aa",
    email: "worker@example.com",
    name: "Worker",
    admin: false,
    superadmin: false,
    isManager: false,
    active: true,
    manager: undefined,
    department: undefined,
    salaryHistory: [],
    ...overrides,
  } as MockManagedUserDoc;

  user.save = overrides.save ?? jest.fn().mockResolvedValue(undefined);
  user.get =
    overrides.get ??
    jest.fn((field: string) => user[field as keyof MockManagedUserDoc]);
  user.set =
    overrides.set ??
    jest.fn((field: string, value: unknown) => {
      (user as Record<string, unknown>)[field] = value;
    });

  return user;
};

const mockedGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockedConnectMongo = connectMongo as jest.MockedFunction<typeof connectMongo>;
const mockedUserModel = UserModel as unknown as {
  find: jest.Mock;
  findById: jest.Mock;
  findOne: jest.Mock;
  countDocuments: jest.Mock;
};
const mockedDepartmentModel = DepartmentModel as unknown as {
  find: jest.Mock;
  findOne: jest.Mock;
  findById: jest.Mock;
};
const mockedProjectModel = ProjectModel as unknown as {
  updateMany: jest.Mock;
};

describe("admin users api", () => {
  const originalSalaryKey = process.env.USER_SALARY_ENCRYPTION_KEY;
  let currentAuthorizedUser: MockUserFields;

  beforeEach(() => {
    process.env.USER_SALARY_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    jest.clearAllMocks();
    currentAuthorizedUser = createMockUser();
    mockedConnectMongo.mockResolvedValue(undefined);
    mockedGetServerSession.mockResolvedValue(createMockSession());
    mockedUserModel.countDocuments.mockReturnValue(makeExecQuery(0));
    mockedUserModel.findOne.mockImplementation((filter: { email?: string }) => {
      if (filter?.email === currentAuthorizedUser.email) {
        return makeFindByIdQuery(currentAuthorizedUser);
      }

      return makeFindByIdQuery(null);
    });
    mockedDepartmentModel.find.mockReturnValue(makeFindQuery([]));
    mockedDepartmentModel.findOne.mockReturnValue(makeFindByIdQuery(null));
    mockedDepartmentModel.findById.mockReturnValue(makeFindByIdQuery(null));
    mockedProjectModel.updateMany.mockReturnValue(makeExecQuery({}));
  });

  afterAll(() => {
    process.env.USER_SALARY_ENCRYPTION_KEY = originalSalaryKey;
  });

  it("returns the latest salary in the users list only when a superadmin explicitly requests it", async () => {
    const request: MockRequest = {
      method: "GET",
      query: { detailed: "true", includeSalary: "true" },
    };
    const response = createMockResponse();

    mockedUserModel.find.mockReturnValue(
      makeFindQuery([
        createManagedUserDoc({
          admin: true,
          salaryHistory: [createSalaryHistoryEntry(24500.5, "2026-03-01")],
        }),
      ])
    );

    await adminUsersHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(200);
    expect(response.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-store, no-cache, max-age=0, must-revalidate"
    );
    expect(response.body).toEqual([
      expect.objectContaining({
        salary: 24500.5,
      }),
    ]);
  });

  it("hides salary by default in the users list response", async () => {
    const request: MockRequest = {
      method: "GET",
      query: { detailed: "true" },
    };
    const response = createMockResponse();

    mockedUserModel.find.mockReturnValue(
      makeFindQuery([
        createManagedUserDoc({
          admin: true,
          salaryHistory: [createSalaryHistoryEntry(23000, "2026-02-01")],
        }),
      ])
    );

    await adminUsersHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(200);
    expect(
      Object.prototype.hasOwnProperty.call(
        (response.body as Array<Record<string, unknown>>)[0],
        "salary"
      )
    ).toBe(false);
  });

  it("forbids non-superadmins from requesting salary visibility in the users list", async () => {
    const request: MockRequest = {
      method: "GET",
      query: { detailed: "true", includeSalary: "true" },
    };
    const response = createMockResponse();

    currentAuthorizedUser = createMockUser({
      admin: true,
      superadmin: false,
    });

    await adminUsersHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(403);
    expect(response.body).toBe("Forbidden");
  });

  it("returns the current salary entry to superadmins through the salary API", async () => {
    const request: MockRequest = {
      method: "GET",
      query: { userId: "507f191e810c19729de860aa" },
    };
    const response = createMockResponse();

    mockedUserModel.findById.mockReturnValue(
      makeFindByIdQuery(
        createManagedUserDoc({
          salaryHistory: [
            createSalaryHistoryEntry(22000, "2026-01-01"),
            createSalaryHistoryEntry(23500, "2026-02-15"),
          ],
        })
      )
    );

    await adminUserSalaryHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(200);
    expect(response.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-store, no-cache, max-age=0, must-revalidate"
    );
    expect(response.body).toEqual({
      _id: "507f191e810c19729de860aa",
      salary: 23500,
      initDate: "2026-02-15",
    });
  });

  it("appends a new salary history entry when a superadmin changes the salary", async () => {
    const request: MockRequest = {
      method: "PUT",
      body: {
        _id: "507f191e810c19729de860aa",
        salary: 26000,
        initDate: "2026-03-15",
      },
    };
    const response = createMockResponse();
    const targetUser = createManagedUserDoc({
      salaryHistory: [createSalaryHistoryEntry(24000, "2026-02-01")],
    });

    mockedUserModel.findById.mockReturnValue(makeFindByIdQuery(targetUser));

    await adminUserSalaryHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(200);
    expect(targetUser.save).toHaveBeenCalledTimes(1);
    expect(targetUser.salaryHistory).toHaveLength(2);
    expect(response.body).toEqual({
      _id: "507f191e810c19729de860aa",
      salary: 26000,
      initDate: "2026-03-15",
    });
  });

  it("does not append a salary history entry when the salary value stays the same", async () => {
    const request: MockRequest = {
      method: "PUT",
      body: {
        _id: "507f191e810c19729de860aa",
        salary: 24000,
        initDate: "2026-03-15",
      },
    };
    const response = createMockResponse();
    const targetUser = createManagedUserDoc({
      salaryHistory: [createSalaryHistoryEntry(24000, "2026-02-01")],
    });

    mockedUserModel.findById.mockReturnValue(makeFindByIdQuery(targetUser));

    await adminUserSalaryHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(200);
    expect(targetUser.save).not.toHaveBeenCalled();
    expect(targetUser.salaryHistory).toHaveLength(1);
    expect(response.body).toEqual({
      _id: "507f191e810c19729de860aa",
      salary: 24000,
      initDate: "2026-02-01",
    });
  });

  it("forbids non-superadmins from reading salary through the dedicated API", async () => {
    const request: MockRequest = {
      method: "GET",
      query: { userId: "507f191e810c19729de860aa" },
    };
    const response = createMockResponse();

    currentAuthorizedUser = createMockUser({
      admin: true,
      superadmin: false,
    });

    await adminUserSalaryHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(403);
    expect(response.body).toBe("Forbidden");
  });

  it("forbids non-superadmins from updating salary through the dedicated API", async () => {
    const request: MockRequest = {
      method: "PUT",
      body: {
        _id: "507f191e810c19729de860aa",
        salary: 23000,
        initDate: "2026-03-15",
      },
    };
    const response = createMockResponse();

    currentAuthorizedUser = createMockUser({
      admin: true,
      superadmin: false,
    });

    await adminUserSalaryHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(403);
    expect(response.body).toBe("Forbidden");
  });

  it("allows only superadmins to grant superadmin privileges", async () => {
    const request: MockRequest = {
      method: "PUT",
      body: {
        _id: "507f191e810c19729de860aa",
        admin: true,
        superadmin: true,
        isManager: false,
        active: true,
        manager: null,
        department: null,
      },
    };
    const response = createMockResponse();

    currentAuthorizedUser = createMockUser({
      admin: true,
      superadmin: false,
    });
    mockedUserModel.findById.mockReturnValue(
      makeFindByIdQuery(
        createManagedUserDoc({
          admin: true,
        })
      )
    );

    await adminUsersHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(403);
    expect(response.body).toBe(
      "Solo un superadmin puede modificar permisos de superadmin"
    );
  });

  it("prevents non-superadmin admins from revoking superadmin privileges", async () => {
    const request: MockRequest = {
      method: "PUT",
      body: {
        _id: "507f191e810c19729de860aa",
        admin: false,
        isManager: false,
        active: true,
        manager: null,
        department: null,
      },
    };
    const response = createMockResponse();

    currentAuthorizedUser = createMockUser({
      admin: true,
      superadmin: false,
    });
    mockedUserModel.findById.mockReturnValue(
      makeFindByIdQuery(
        createManagedUserDoc({
          admin: true,
          superadmin: true,
        })
      )
    );

    await adminUsersHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(403);
    expect(response.body).toBe(
      "Solo un superadmin puede revocar permisos de superadmin"
    );
  });

  it("rejects attempts to mark non-admin users as superadmin", async () => {
    const request: MockRequest = {
      method: "PUT",
      body: {
        _id: "507f191e810c19729de860aa",
        admin: false,
        superadmin: true,
        isManager: false,
        active: true,
        manager: null,
        department: null,
      },
    };
    const response = createMockResponse();

    mockedUserModel.findById.mockReturnValue(
      makeFindByIdQuery(
        createManagedUserDoc({
          admin: false,
        })
      )
    );

    await adminUsersHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe("Solo los usuarios admin pueden ser superadmin");
  });

  it("allows superadmins to grant superadmin privileges to admin users", async () => {
    const request: MockRequest = {
      method: "PUT",
      body: {
        _id: "507f191e810c19729de860aa",
        admin: true,
        superadmin: true,
        isManager: false,
        active: true,
        manager: null,
        department: null,
      },
    };
    const response = createMockResponse();
    const targetUser = createManagedUserDoc({
      admin: true,
      superadmin: false,
    });

    mockedUserModel.findById.mockReturnValue(makeFindByIdQuery(targetUser));

    await adminUsersHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(200);
    expect(targetUser.superadmin).toBe(true);
    expect(targetUser.save).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual(
      expect.objectContaining({
        superadmin: true,
      })
    );
  });
});
