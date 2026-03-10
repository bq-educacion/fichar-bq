import { LOG_TYPE, Log } from "@/types";
import mongoose from "mongoose";
import {
  numberOfManualDays,
  computeElapsedHours,
  logsIn,
  logsOut,
  numberOfDays,
  getHoursToday,
  decimalToHours,
  datetoHHMM,
  dateToTimeInputValue,
  hhmmToMinutes,
  realLogs,
  statsFromLogs,
  validateManualHoursRange,
} from "@/lib/utils";

// Helper to create a Log object with minimal required fields
const makeLog = (
  type: LOG_TYPE,
  date: Date,
  overrides?: Partial<Log>
): Log => ({
  _id: new mongoose.Types.ObjectId().toString(),
  type,
  date,
  user: "test@example.com",
  ...overrides,
});

// Helper: create a date at a specific hour:minute on a given day offset from a base
const dateAt = (
  hours: number,
  minutes: number,
  dayOffset: number = 0,
  base?: Date
): Date => {
  const d = base ? new Date(base) : new Date(2025, 0, 6); // Monday Jan 6, 2025
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

// ─── computeElapsedHours ────────────────────────────────────────────────────

describe("computeElapsedHours", () => {
  it("returns 0 for empty logs", () => {
    expect(computeElapsedHours([])).toBe(0);
  });

  it("computes hours for a single in/out pair", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.out, dateAt(17, 0)),
    ];
    expect(computeElapsedHours(logs)).toBe(8);
  });

  it("computes hours for in/pause pair", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.pause, dateAt(13, 0)),
    ];
    expect(computeElapsedHours(logs)).toBe(4);
  });

  it("computes hours for multiple in/out pairs (with pause)", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.pause, dateAt(13, 0)), // 4h
      makeLog(LOG_TYPE.in, dateAt(14, 0)),
      makeLog(LOG_TYPE.out, dateAt(18, 0)), // 4h
    ];
    expect(computeElapsedHours(logs)).toBe(8);
  });

  it("does not count time after last 'in' when addCurrentTime is false", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
    ];
    expect(computeElapsedHours(logs, false)).toBe(0);
  });

  it("counts time until 'now' when addCurrentTime is true and last log is 'in'", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
    ];
    const now = dateAt(11, 0); // 2 hours later
    expect(computeElapsedHours(logs, true, now)).toBe(2);
  });

  it("handles multiple sessions with addCurrentTime on last open session", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.pause, dateAt(12, 0)), // 3h
      makeLog(LOG_TYPE.in, dateAt(13, 0)),
      // still working
    ];
    const now = dateAt(15, 30); // 2.5h since last in
    expect(computeElapsedHours(logs, true, now)).toBe(5.5);
  });

  it("handles logs spanning multiple days", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0, 0)),
      makeLog(LOG_TYPE.out, dateAt(17, 0, 0)), // 8h day 1
      makeLog(LOG_TYPE.in, dateAt(9, 0, 1)),
      makeLog(LOG_TYPE.out, dateAt(17, 0, 1)), // 8h day 2
    ];
    expect(computeElapsedHours(logs)).toBe(16);
  });

  it("ignores orphan out/pause logs that have no preceding in", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.out, dateAt(8, 0)),
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.out, dateAt(17, 0)),
    ];
    expect(computeElapsedHours(logs)).toBe(8);
  });

  it("handles manual logs the same as normal logs", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0), { manual: true }),
      makeLog(LOG_TYPE.out, dateAt(17, 0), { manual: true }),
    ];
    expect(computeElapsedHours(logs)).toBe(8);
  });

  it("handles goback type by ignoring it in pairs", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.out, dateAt(17, 0)), // 8h
      makeLog(LOG_TYPE.goback, dateAt(17, 5)),
    ];
    // goback is not in/out/pause, so it doesn't affect pair counting
    expect(computeElapsedHours(logs)).toBe(8);
  });
});

// ─── logsIn / logsOut (backward compatibility) ──────────────────────────────

describe("logsIn", () => {
  it("returns sum of timestamps for 'in' logs", () => {
    const d1 = dateAt(9, 0);
    const d2 = dateAt(14, 0);
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, d1),
      makeLog(LOG_TYPE.out, dateAt(13, 0)),
      makeLog(LOG_TYPE.in, d2),
    ];
    expect(logsIn(logs)).toBe(d1.getTime() + d2.getTime());
  });

  it("returns 0 for empty array", () => {
    expect(logsIn([])).toBe(0);
  });
});

describe("logsOut", () => {
  it("returns sum of timestamps for 'out' and 'pause' logs", () => {
    const d1 = dateAt(13, 0);
    const d2 = dateAt(18, 0);
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.pause, d1),
      makeLog(LOG_TYPE.in, dateAt(14, 0)),
      makeLog(LOG_TYPE.out, d2),
    ];
    expect(logsOut(logs)).toBe(d1.getTime() + d2.getTime());
  });

  it("returns 0 for empty array", () => {
    expect(logsOut([])).toBe(0);
  });
});

// ─── numberOfDays ───────────────────────────────────────────────────────────

describe("numberOfDays", () => {
  it("returns 0 for empty input", () => {
    expect(numberOfDays([])).toBe(0);
  });

  it("counts distinct days", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0, 0)),
      makeLog(LOG_TYPE.out, dateAt(17, 0, 0)),
      makeLog(LOG_TYPE.in, dateAt(9, 0, 1)),
      makeLog(LOG_TYPE.out, dateAt(17, 0, 1)),
      makeLog(LOG_TYPE.in, dateAt(9, 0, 1)), // same day as above
    ];
    expect(numberOfDays(logs)).toBe(2);
  });

  it("returns 1 for logs all on the same day", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.pause, dateAt(13, 0)),
      makeLog(LOG_TYPE.in, dateAt(14, 0)),
      makeLog(LOG_TYPE.out, dateAt(18, 0)),
    ];
    expect(numberOfDays(logs)).toBe(1);
  });
});

// ─── numberOfManualDays ─────────────────────────────────────────────────────

describe("numberOfManualDays", () => {
  it("returns 0 when no manual logs", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.out, dateAt(17, 0)),
    ];
    expect(numberOfManualDays(logs)).toBe(0);
  });

  it("returns 0 for empty input", () => {
    expect(numberOfManualDays([])).toBe(0);
  });

  it("counts distinct manual days, not individual manual entries", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0), { manual: true }),
      makeLog(LOG_TYPE.out, dateAt(17, 0), { manual: true }), // same day
      makeLog(LOG_TYPE.in, dateAt(9, 0, 1), { manual: true }), // different day
      makeLog(LOG_TYPE.out, dateAt(17, 0, 1), { manual: true }),
    ];
    expect(numberOfManualDays(logs)).toBe(2);
  });

  it("only counts days where manual flag is true", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0), { manual: true }),
      makeLog(LOG_TYPE.out, dateAt(17, 0), { manual: true }),
      makeLog(LOG_TYPE.in, dateAt(9, 0, 1)), // not manual
      makeLog(LOG_TYPE.out, dateAt(17, 0, 1)),
    ];
    expect(numberOfManualDays(logs)).toBe(1);
  });

  it("handles mixed manual and non-manual logs on same day", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0), { manual: true }),
      makeLog(LOG_TYPE.pause, dateAt(13, 0)), // not manual but same day
      makeLog(LOG_TYPE.in, dateAt(14, 0), { manual: true }),
      makeLog(LOG_TYPE.out, dateAt(17, 0), { manual: true }),
    ];
    expect(numberOfManualDays(logs)).toBe(1);
  });
});

// ─── getHoursToday ──────────────────────────────────────────────────────────

describe("getHoursToday", () => {
  it("returns 0 when no 'in' logs", () => {
    const logs: Log[] = [makeLog(LOG_TYPE.out, dateAt(17, 0))];
    expect(getHoursToday(logs)).toBe(0);
  });

  it("returns 0 for empty logs", () => {
    expect(getHoursToday([])).toBe(0);
  });

  it("computes completed hours for in/out pair", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.out, dateAt(17, 0)),
    ];
    expect(getHoursToday(logs)).toBe(8);
  });

  it("adds current time when last log is 'in'", () => {
    const logs: Log[] = [makeLog(LOG_TYPE.in, dateAt(9, 0))];
    const now = dateAt(12, 0);
    expect(getHoursToday(logs, now)).toBe(3);
  });

  it("does not add current time when last log is 'pause'", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.pause, dateAt(13, 0)),
    ];
    const now = dateAt(15, 0);
    expect(getHoursToday(logs, now)).toBe(4);
  });

  it("handles multiple sessions with currently working", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.pause, dateAt(13, 0)), // 4h
      makeLog(LOG_TYPE.in, dateAt(14, 0)),
      // still working
    ];
    const now = dateAt(16, 30); // 2.5h
    expect(getHoursToday(logs, now)).toBe(6.5);
  });

  it("handles a full day with pause and resume", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.pause, dateAt(13, 0)), // 4h
      makeLog(LOG_TYPE.in, dateAt(14, 0)),
      makeLog(LOG_TYPE.out, dateAt(18, 0)), // 4h
    ];
    expect(getHoursToday(logs)).toBe(8);
  });

  it("computes hours for manual logs", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0), { manual: true }),
      makeLog(LOG_TYPE.out, dateAt(17, 0), { manual: true }),
    ];
    expect(getHoursToday(logs)).toBe(8);
  });
});

// ─── decimalToHours ─────────────────────────────────────────────────────────

describe("decimalToHours", () => {
  it("converts integer hours", () => {
    expect(decimalToHours(8)).toBe("8h0m");
  });

  it("converts fractional hours", () => {
    expect(decimalToHours(8.5)).toBe("8h30m");
  });

  it("converts zero", () => {
    expect(decimalToHours(0)).toBe("0h0m");
  });

  it("handles small fractions", () => {
    expect(decimalToHours(0.25)).toBe("0h15m");
  });

  it("handles negative values", () => {
    expect(decimalToHours(-2.5)).toBe("-2h30m");
  });

  it("handles negative zero as positive", () => {
    expect(decimalToHours(-0)).toBe("0h0m");
  });
});

// ─── datetoHHMM ─────────────────────────────────────────────────────────────

describe("datetoHHMM", () => {
  it("formats hours and minutes correctly", () => {
    expect(datetoHHMM(new Date(2025, 0, 6, 14, 30))).toBe("14:30");
  });

  it("pads single-digit minutes with zero", () => {
    expect(datetoHHMM(new Date(2025, 0, 6, 9, 5))).toBe("9:05");
  });

  it("formats midnight correctly", () => {
    expect(datetoHHMM(new Date(2025, 0, 6, 0, 0))).toBe("0:00");
  });

  it("does not pad single-digit hours", () => {
    expect(datetoHHMM(new Date(2025, 0, 6, 8, 0))).toBe("8:00");
  });
});

// ─── hhmmToMinutes ─────────────────────────────────────────────────────────

describe("hhmmToMinutes", () => {
  it("parses valid HH:MM values", () => {
    expect(hhmmToMinutes("09:30")).toBe(570);
  });

  it("returns null for non-padded values", () => {
    expect(hhmmToMinutes("9:30")).toBeNull();
  });

  it("returns null for out-of-range values", () => {
    expect(hhmmToMinutes("24:00")).toBeNull();
  });
});

// ─── dateToTimeInputValue ──────────────────────────────────────────────────

describe("dateToTimeInputValue", () => {
  it("returns HH:MM with zero padding", () => {
    expect(dateToTimeInputValue(new Date(2025, 0, 6, 8, 5))).toBe("08:05");
  });

  it("formats late-evening values", () => {
    expect(dateToTimeInputValue(new Date(2025, 0, 6, 23, 59))).toBe("23:59");
  });
});

// ─── validateManualHoursRange ──────────────────────────────────────────────

describe("validateManualHoursRange", () => {
  const now = new Date(2025, 0, 6, 12, 30, 0, 0);

  it("accepts a valid range before current time", () => {
    expect(validateManualHoursRange("09:00", "12:00", now)).toEqual({
      isValid: true,
      error: null,
    });
  });

  it("rejects when start is not earlier than end", () => {
    expect(validateManualHoursRange("12:00", "12:00", now)).toEqual({
      isValid: false,
      error: "La hora de entrada debe ser anterior a la hora de salida",
    });
  });

  it("rejects end hour later than current time", () => {
    expect(validateManualHoursRange("09:00", "13:00", now)).toEqual({
      isValid: false,
      error: "La hora de salida no puede ser posterior a la hora actual",
    });
  });

  it("can skip current time validation for server-side checks", () => {
    expect(
      validateManualHoursRange("09:00", "13:00", now, { enforceNowLimit: false })
    ).toEqual({
      isValid: true,
      error: null,
    });
  });

  it("rejects invalid format", () => {
    expect(validateManualHoursRange("9:00", "12:00", now)).toEqual({
      isValid: false,
      error: "Formato de hora invalido",
    });
  });
});

// ─── realLogs ───────────────────────────────────────────────────────────────

describe("realLogs", () => {
  it("returns empty array for empty input", () => {
    expect(realLogs([])).toHaveLength(0);
  });

  it("truncates after last out log", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.out, dateAt(17, 0)),
      makeLog(LOG_TYPE.in, dateAt(18, 0)), // trailing in without out
    ];
    const result = realLogs(logs);
    expect(result).toHaveLength(2);
    expect(result[1].type).toBe(LOG_TYPE.out);
  });

  it("keeps all logs when last log is out", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.out, dateAt(17, 0)),
    ];
    expect(realLogs(logs)).toHaveLength(2);
  });

  it("returns empty when no out log exists", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.pause, dateAt(13, 0)),
      makeLog(LOG_TYPE.in, dateAt(14, 0)),
    ];
    expect(realLogs(logs)).toHaveLength(0);
  });

  it("handles multiple days and truncates at last out", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0, 0)),
      makeLog(LOG_TYPE.out, dateAt(17, 0, 0)),
      makeLog(LOG_TYPE.in, dateAt(9, 0, 1)),
      makeLog(LOG_TYPE.out, dateAt(17, 0, 1)),
      makeLog(LOG_TYPE.in, dateAt(9, 0, 2)), // incomplete day 3
    ];
    const result = realLogs(logs);
    expect(result).toHaveLength(4);
    expect(result[3].type).toBe(LOG_TYPE.out);
  });
});

// ─── statsFromLogs ──────────────────────────────────────────────────────────

describe("statsFromLogs", () => {
  it("returns zeros for empty input", () => {
    const result = statsFromLogs([]);
    expect(result).toEqual({
      total: 0,
      average: 0,
      logsDays: 0,
      manualLogsDays: 0,
    });
  });

  it("computes correct stats for a single complete day", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.out, dateAt(17, 0)),
    ];
    const result = statsFromLogs(logs);
    expect(result.total).toBe(8);
    expect(result.average).toBe(8);
    expect(result.logsDays).toBe(1);
    expect(result.manualLogsDays).toBe(0);
  });

  it("computes correct stats for multiple days", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0, 0)),
      makeLog(LOG_TYPE.out, dateAt(17, 0, 0)), // 8h
      makeLog(LOG_TYPE.in, dateAt(9, 0, 1)),
      makeLog(LOG_TYPE.out, dateAt(13, 0, 1)), // 4h
    ];
    const result = statsFromLogs(logs);
    expect(result.total).toBe(12);
    expect(result.average).toBe(6);
    expect(result.logsDays).toBe(2);
  });

  it("strips trailing incomplete session via realLogs", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0, 0)),
      makeLog(LOG_TYPE.out, dateAt(17, 0, 0)), // 8h complete
      makeLog(LOG_TYPE.in, dateAt(9, 0, 1)),   // incomplete, no out
    ];
    const result = statsFromLogs(logs);
    expect(result.total).toBe(8);
    expect(result.logsDays).toBe(1);
  });

  it("handles day with pause and resume correctly", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.pause, dateAt(13, 0)), // 4h
      makeLog(LOG_TYPE.in, dateAt(14, 0)),
      makeLog(LOG_TYPE.out, dateAt(18, 0)), // 4h
    ];
    const result = statsFromLogs(logs);
    expect(result.total).toBe(8);
    expect(result.average).toBe(8);
    expect(result.logsDays).toBe(1);
  });

  it("counts manual log days correctly", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0, 0), { manual: true }),
      makeLog(LOG_TYPE.out, dateAt(17, 0, 0), { manual: true }), // manual day
      makeLog(LOG_TYPE.in, dateAt(9, 0, 1)),
      makeLog(LOG_TYPE.out, dateAt(17, 0, 1)), // non-manual day
    ];
    const result = statsFromLogs(logs);
    expect(result.total).toBe(16);
    expect(result.average).toBe(8);
    expect(result.logsDays).toBe(2);
    expect(result.manualLogsDays).toBe(1);
  });

  it("counts multiple manual days across periods", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0, 0), { manual: true }),
      makeLog(LOG_TYPE.out, dateAt(17, 0, 0), { manual: true }),
      makeLog(LOG_TYPE.in, dateAt(9, 0, 1), { manual: true }),
      makeLog(LOG_TYPE.out, dateAt(17, 0, 1), { manual: true }),
      makeLog(LOG_TYPE.in, dateAt(9, 0, 2)),
      makeLog(LOG_TYPE.out, dateAt(17, 0, 2)),
    ];
    const result = statsFromLogs(logs);
    expect(result.total).toBe(24);
    expect(result.average).toBe(8);
    expect(result.logsDays).toBe(3);
    expect(result.manualLogsDays).toBe(2);
  });

  it("handles only manual logs", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0), { manual: true }),
      makeLog(LOG_TYPE.out, dateAt(17, 0), { manual: true }),
    ];
    const result = statsFromLogs(logs);
    expect(result.total).toBe(8);
    expect(result.logsDays).toBe(1);
    expect(result.manualLogsDays).toBe(1);
  });

  it("handles manual logs with pauses", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0), { manual: true }),
      makeLog(LOG_TYPE.pause, dateAt(13, 0), { manual: true }), // 4h
      makeLog(LOG_TYPE.in, dateAt(14, 0), { manual: true }),
      makeLog(LOG_TYPE.out, dateAt(18, 0), { manual: true }), // 4h
    ];
    const result = statsFromLogs(logs);
    expect(result.total).toBe(8);
    expect(result.logsDays).toBe(1);
    expect(result.manualLogsDays).toBe(1);
  });

  it("returns zero totals when no complete sessions exist", () => {
    const logs: Log[] = [
      makeLog(LOG_TYPE.in, dateAt(9, 0)),
      makeLog(LOG_TYPE.pause, dateAt(13, 0)),
      makeLog(LOG_TYPE.in, dateAt(14, 0)),
    ];
    const result = statsFromLogs(logs);
    expect(result.total).toBe(0);
    expect(result.logsDays).toBe(0);
    expect(result.manualLogsDays).toBe(0);
  });
});
