import {
  getUtcRangeForLocalDate,
  localDateTimeToUtc,
  resolveClientTimeContext,
} from "@/lib/clientTime";

describe("clientTime", () => {
  it("converts winter and summer times using browser timezone rules", () => {
    const context = resolveClientTimeContext({ clientTimeZone: "Europe/Madrid" });
    expect(context.mode).toBe("timezone");

    const winter = localDateTimeToUtc(context, { year: 2026, month: 1, day: 15 }, 9, 0);
    const summer = localDateTimeToUtc(context, { year: 2026, month: 7, day: 15 }, 9, 0);

    expect(winter.toISOString()).toBe("2026-01-15T08:00:00.000Z");
    expect(summer.toISOString()).toBe("2026-07-15T07:00:00.000Z");
  });

  it("rejects non-existent local times during DST forward jump", () => {
    const context = resolveClientTimeContext({ clientTimeZone: "Europe/Madrid" });
    expect(context.mode).toBe("timezone");

    expect(() =>
      localDateTimeToUtc(context, { year: 2026, month: 3, day: 29 }, 2, 30)
    ).toThrow("no existe");
  });

  it("builds local-day ranges with DST-aware length", () => {
    const context = resolveClientTimeContext({ clientTimeZone: "Europe/Madrid" });
    expect(context.mode).toBe("timezone");

    const springForward = getUtcRangeForLocalDate(context, {
      year: 2026,
      month: 3,
      day: 29,
    });
    const fallBack = getUtcRangeForLocalDate(context, {
      year: 2026,
      month: 10,
      day: 25,
    });

    const springMs = springForward.endUtc.getTime() - springForward.startUtc.getTime() + 1;
    const fallMs = fallBack.endUtc.getTime() - fallBack.startUtc.getTime() + 1;

    expect(springMs).toBe(23 * 60 * 60 * 1000);
    expect(fallMs).toBe(25 * 60 * 60 * 1000);
  });
});
