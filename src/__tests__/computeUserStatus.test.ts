import { deriveUserStatusFromLastLogType } from "@/controllers/computeUserStatus";
import { LOG_TYPE, USER_STATUS } from "@/types";

describe("deriveUserStatusFromLastLogType", () => {
  it("returns paused for pause logs", () => {
    expect(deriveUserStatusFromLastLogType(LOG_TYPE.pause)).toBe(USER_STATUS.paused);
  });

  it("returns finished for out logs", () => {
    expect(deriveUserStatusFromLastLogType(LOG_TYPE.out)).toBe(USER_STATUS.finished);
  });

  it("returns working for in logs", () => {
    expect(deriveUserStatusFromLastLogType(LOG_TYPE.in)).toBe(USER_STATUS.working);
  });

  it("returns working for goback logs", () => {
    expect(deriveUserStatusFromLastLogType(LOG_TYPE.goback)).toBe(USER_STATUS.working);
  });
});
