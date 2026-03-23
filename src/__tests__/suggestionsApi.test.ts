import adminSuggestionsHandler from "@/pages/api/admin/suggestions";
import suggestionsHandler from "@/pages/api/suggestions";
import { SuggestionModel } from "@/db/Suggestion";
import connectMongo from "@/lib/connectMongo";
import getUserByEmail, { type UserDocument } from "@/controllers/getUser";
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
jest.mock("@/controllers/getUser", () => jest.fn());
jest.mock("@/db/Suggestion", () => ({
  SuggestionModel: {
    create: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
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
  status: jest.MockedFunction<(code: number) => MockResponse>;
  json: jest.MockedFunction<(payload: unknown) => MockResponse>;
  send: jest.MockedFunction<(payload: unknown) => MockResponse>;
  end: jest.MockedFunction<() => MockResponse>;
};

type SortQuery<T> = {
  sort: jest.Mock<SortQuery<T>, [Record<string, 1 | -1>]>;
  exec: jest.Mock<Promise<T>, []>;
};

type ExecQuery<T> = {
  exec: jest.Mock<Promise<T>, []>;
};

type MockUserFields = Pick<UserDocument, "admin" | "legal" | "email">;

const createMockResponse = (): MockResponse => {
  const response = {
    statusCode: 200,
    body: undefined,
  } as MockResponse;

  response.status = jest.fn().mockImplementation((code: number) => {
    response.statusCode = code;
    return response;
  });
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

const makeSortQuery = <T>(result: T): SortQuery<T> => {
  const query = {} as SortQuery<T>;
  query.sort = jest.fn().mockReturnValue(query);
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
): UserDocument =>
  ({
    admin: true,
    legal: true,
    email: "admin@example.com",
    ...overrides,
  } as unknown as UserDocument);

const mockedGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockedConnectMongo = connectMongo as jest.MockedFunction<typeof connectMongo>;
const mockedGetUserByEmail = getUserByEmail as jest.MockedFunction<
  typeof getUserByEmail
>;
const mockedSuggestionModel = SuggestionModel as unknown as {
  create: jest.Mock;
  find: jest.Mock;
  findByIdAndUpdate: jest.Mock;
};

describe("suggestions api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedConnectMongo.mockResolvedValue(undefined);
    mockedGetServerSession.mockResolvedValue(createMockSession());
    mockedGetUserByEmail.mockResolvedValue(createMockUser());
  });

  it("creates a suggestion for authenticated users and trims the text", async () => {
    const request: MockRequest = {
      method: "POST",
      body: { text: "  Esto podria ir mejor  " },
    };
    const response = createMockResponse();

    mockedSuggestionModel.create.mockResolvedValue({
      _id: "507f191e810c19729de860aa",
      text: "Esto podria ir mejor",
      date: new Date("2026-03-23T09:30:00.000Z"),
      archived: false,
    });

    await suggestionsHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(201);
    expect(mockedSuggestionModel.create).toHaveBeenCalledWith({
      text: "Esto podria ir mejor",
    });
    expect(response.json).toHaveBeenCalledTimes(1);
  });

  it("rejects blank suggestions", async () => {
    const request: MockRequest = {
      method: "POST",
      body: { text: "   " },
    };
    const response = createMockResponse();

    await suggestionsHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe(
      "Bad Request: text: Escribe una sugerencia o queja laboral"
    );
    expect(mockedSuggestionModel.create).not.toHaveBeenCalled();
  });

  it("requires admin permissions to read suggestions", async () => {
    const request: MockRequest = {
      method: "GET",
      query: { archived: "false" },
    };
    const response = createMockResponse();

    mockedGetUserByEmail.mockResolvedValue(
      createMockUser({
        admin: false,
        email: "worker@example.com",
      })
    );

    await adminSuggestionsHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(403);
    expect(response.body).toBe("Forbidden");
    expect(mockedSuggestionModel.find).not.toHaveBeenCalled();
  });

  it("updates the archived flag for admin users", async () => {
    const request: MockRequest = {
      method: "PATCH",
      body: {
        id: "507f191e810c19729de860aa",
        archived: true,
      },
    };
    const response = createMockResponse();

    mockedSuggestionModel.findByIdAndUpdate.mockReturnValue(
      makeExecQuery({
        _id: "507f191e810c19729de860aa",
        text: "Texto",
        date: new Date("2026-03-23T10:00:00.000Z"),
        archived: true,
      })
    );

    await adminSuggestionsHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(200);
    expect(mockedSuggestionModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "507f191e810c19729de860aa",
      { archived: true },
      { new: true }
    );
  });

  it("returns the filtered suggestions list for admins", async () => {
    const request: MockRequest = {
      method: "GET",
      query: { archived: "true" },
    };
    const response = createMockResponse();

    mockedSuggestionModel.find.mockReturnValue(
      makeSortQuery([
        {
          _id: "507f191e810c19729de860aa",
          text: "Texto archivado",
          date: new Date("2026-03-22T10:00:00.000Z"),
          archived: true,
        },
      ])
    );

    await adminSuggestionsHandler(toApiRequest(request), toApiResponse(response));

    expect(response.statusCode).toBe(200);
    expect(mockedSuggestionModel.find).toHaveBeenCalledWith({ archived: true });
    expect(response.json).toHaveBeenCalledTimes(1);
  });
});
