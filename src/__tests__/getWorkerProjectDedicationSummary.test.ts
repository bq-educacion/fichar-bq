import getWorkerProjectDedicationSummary from "@/controllers/getWorkerProjectDedicationSummary";
import { ProjectDedicationModel, ProjectModel, UserModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";

jest.mock("@/lib/connectMongo", () => jest.fn());
jest.mock("@/db/Models", () => ({
  UserModel: { findOne: jest.fn() },
  ProjectDedicationModel: { find: jest.fn() },
  ProjectModel: { find: jest.fn() },
}));

type QueryMock<T> = {
  select: jest.Mock<QueryMock<T>, [string]>;
  exec: jest.Mock<Promise<T>, []>;
};

const makeQuery = <T>(result: T): QueryMock<T> => {
  const query = {} as QueryMock<T>;
  query.select = jest.fn().mockReturnValue(query);
  query.exec = jest.fn().mockResolvedValue(result);
  return query;
};

const mockedConnectMongo = connectMongo as jest.MockedFunction<typeof connectMongo>;
const mockedUserModel = UserModel as unknown as {
  findOne: jest.Mock;
};
const mockedProjectDedicationModel = ProjectDedicationModel as unknown as {
  find: jest.Mock;
};
const mockedProjectModel = ProjectModel as unknown as {
  find: jest.Mock;
};

describe("getWorkerProjectDedicationSummary", () => {
  const workerEmail = "worker@example.com";
  const workerId = "507f191e810c19729de860ea";
  const projectAId = "507f191e810c19729de860ab";
  const projectBId = "507f191e810c19729de860ac";

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 10, 12, 0, 0, 0)); // 10 Mar 2026 (Tuesday)
    jest.clearAllMocks();
    mockedConnectMongo.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("throws when worker is not found", async () => {
    mockedUserModel.findOne.mockReturnValue(makeQuery(null));

    await expect(
      getWorkerProjectDedicationSummary(workerEmail)
    ).rejects.toThrow("Worker not found");

    expect(mockedConnectMongo).toHaveBeenCalledTimes(1);
    expect(mockedProjectDedicationModel.find).not.toHaveBeenCalled();
  });

  it("aggregates and normalizes dedication by project for requested periods", async () => {
    mockedUserModel.findOne.mockReturnValue(makeQuery({ _id: workerId }));

    mockedProjectDedicationModel.find.mockReturnValue(
      makeQuery([
        {
          date: new Date(2026, 2, 9, 0, 0, 0, 0), // this week
          dedications: [
            { projectId: projectAId, dedication: 60 },
            { projectId: projectBId, dedication: 40 },
          ],
        },
        {
          date: new Date(2026, 2, 10, 0, 0, 0, 0), // this week
          dedications: [
            { projectId: projectAId, dedication: 50 },
            { projectId: projectBId, dedication: 50 },
          ],
        },
        {
          date: new Date(2026, 2, 3, 0, 0, 0, 0), // previous week
          dedications: [{ projectId: projectAId, dedication: 100 }],
        },
        {
          date: new Date(2026, 2, 6, 0, 0, 0, 0), // previous week
          dedications: [{ projectId: projectBId, dedication: 100 }],
        },
        {
          date: new Date(2026, 2, 1, 0, 0, 0, 0), // this month only
          dedications: [{ projectId: projectBId, dedication: 100 }],
        },
      ])
    );

    mockedProjectModel.find.mockReturnValue(
      makeQuery([
        { _id: projectAId, name: "Zeta" },
        { _id: projectBId, name: "Alpha" },
      ])
    );

    const result = await getWorkerProjectDedicationSummary(workerEmail);

    expect(mockedProjectDedicationModel.find).toHaveBeenCalledTimes(1);
    expect(mockedProjectModel.find).toHaveBeenCalledWith({
      _id: { $in: [projectAId, projectBId] },
    });

    expect(result).toEqual({
      thisWeekDaysElapsed: 2,
      previousWeekDays: 2,
      thisMonthDaysElapsed: 5,
      rows: [
        {
          projectId: projectBId,
          projectName: "Alpha",
          thisWeek: 45,
          previousWeek: 50,
          thisMonth: 58,
        },
        {
          projectId: projectAId,
          projectName: "Zeta",
          thisWeek: 55,
          previousWeek: 50,
          thisMonth: 42,
        },
      ],
    });
  });

  it("returns empty rows when no dedication documents exist in range", async () => {
    mockedUserModel.findOne.mockReturnValue(makeQuery({ _id: workerId }));
    mockedProjectDedicationModel.find.mockReturnValue(makeQuery([]));

    const result = await getWorkerProjectDedicationSummary(workerEmail);

    expect(result.thisWeekDaysElapsed).toBe(0);
    expect(result.previousWeekDays).toBe(0);
    expect(result.thisMonthDaysElapsed).toBe(0);
    expect(result.rows).toEqual([]);
    expect(mockedProjectModel.find).not.toHaveBeenCalled();
  });

  it("uses fallback project name when a project no longer exists", async () => {
    const deletedProjectId = "507f191e810c19729de860ad";

    mockedUserModel.findOne.mockReturnValue(makeQuery({ _id: workerId }));
    mockedProjectDedicationModel.find.mockReturnValue(
      makeQuery([
        {
          date: new Date(2026, 2, 9, 0, 0, 0, 0),
          dedications: [{ projectId: deletedProjectId, dedication: 100 }],
        },
      ])
    );
    mockedProjectModel.find.mockReturnValue(makeQuery([]));

    const result = await getWorkerProjectDedicationSummary(workerEmail);

    expect(result.rows).toEqual([
      {
        projectId: deletedProjectId,
        projectName: "Proyecto eliminado",
        thisWeek: 100,
        previousWeek: 0,
        thisMonth: 100,
      },
    ]);
  });
});
