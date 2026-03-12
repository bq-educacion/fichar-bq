import getMyWorkers from "@/controllers/getMyWorkers";
import { LogModel, UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { statsFromLogs } from "@/lib/utils";

jest.mock("@/lib/connectMongo", () => jest.fn());
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  statsFromLogs: jest.fn(),
}));
jest.mock("@/db/Models", () => ({
  LogModel: { find: jest.fn() },
  UserModel: { find: jest.fn() },
}));

type ExecQuery<T> = {
  exec: jest.Mock<Promise<T>, []>;
};

type SortQuery<T> = {
  sort: jest.Mock<SortQuery<T>, [Record<string, 1 | -1>]>;
  exec: jest.Mock<Promise<T>, []>;
};

const makeExecQuery = <T>(result: T): ExecQuery<T> => ({
  exec: jest.fn().mockResolvedValue(result),
});

const makeSortQuery = <T>(result: T): SortQuery<T> => {
  const query = {} as SortQuery<T>;
  query.sort = jest.fn().mockReturnValue(query);
  query.exec = jest.fn().mockResolvedValue(result);
  return query;
};

const mockedConnectMongo = connectMongo as jest.MockedFunction<typeof connectMongo>;
const mockedStatsFromLogs = statsFromLogs as jest.MockedFunction<typeof statsFromLogs>;
const mockedUserModel = UserModel as unknown as { find: jest.Mock };
const mockedLogModel = LogModel as unknown as { find: jest.Mock };

describe("getMyWorkers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 12, 10, 30, 0, 0));
    jest.clearAllMocks();
    mockedConnectMongo.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps average from statsFromLogs (per logged day) in manager table stats", async () => {
    mockedUserModel.find.mockReturnValue(
      makeExecQuery([
        {
          _id: "507f191e810c19729de860ea",
          email: "worker@example.com",
          active: true,
          isManager: false,
          admin: false,
          name: "Worker Example",
          image: "",
          status: { status: "not_started" },
          manager: "manager@example.com",
          legal: true,
        },
      ])
    );
    mockedLogModel.find.mockReturnValue(makeSortQuery([]));
    mockedStatsFromLogs.mockReturnValue({
      total: 12,
      average: 6,
      logsDays: 2,
      manualLogsDays: 1,
    });

    const now = new Date();
    const expectedRangeStart = new Date(now);
    expectedRangeStart.setHours(0, 0, 0, 0);
    expectedRangeStart.setDate(expectedRangeStart.getDate() - 29);

    const result = await getMyWorkers("manager@example.com");

    expect(mockedConnectMongo).toHaveBeenCalledTimes(1);
    expect(mockedStatsFromLogs).toHaveBeenCalledTimes(1);
    expect(mockedLogModel.find).toHaveBeenCalledWith({
      user: "worker@example.com",
      date: {
        $gte: expectedRangeStart,
        $lte: now,
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0].stats).toEqual({
      total: 12,
      average: 6,
      logsDays: 2,
      manualLogsDays: 1,
    });
  });
});
