export type LocalDate = {
  year: number;
  month: number;
  day: number;
};

export type ClientTimeInput = {
  clientTimezoneOffsetMinutes?: number;
  clientTimeZone?: string;
};

type TimeZoneDateTimeParts = LocalDate & {
  hour: number;
  minute: number;
  second: number;
};

type TimeZoneClientTimeContext = {
  mode: "timezone";
  timeZone: string;
  nowLocalDate: LocalDate;
  nowMinutes: number;
};

type OffsetClientTimeContext = {
  mode: "offset";
  offsetMinutes: number;
  nowLocalDate: LocalDate;
  nowMinutes: number;
};

export type ClientTimeContext = TimeZoneClientTimeContext | OffsetClientTimeContext;

const MIN_TIMEZONE_OFFSET_MINUTES = -840;
const MAX_TIMEZONE_OFFSET_MINUTES = 840;
const timeZoneFormatters = new Map<string, Intl.DateTimeFormat>();

const isValidTimeZone = (timeZone: string): boolean => {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

const normalizeClientTimeZone = (value?: string): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return isValidTimeZone(trimmed) ? trimmed : null;
};

const normalizeClientTimezoneOffsetMinutes = (value?: number): number => {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_TIMEZONE_OFFSET_MINUTES &&
    value <= MAX_TIMEZONE_OFFSET_MINUTES
  ) {
    return value;
  }

  return new Date().getTimezoneOffset();
};

const getTimeZoneFormatter = (timeZone: string) => {
  const cached = timeZoneFormatters.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  timeZoneFormatters.set(timeZone, formatter);
  return formatter;
};

const getDateTimePartsInTimeZone = (
  date: Date,
  timeZone: string
): TimeZoneDateTimeParts => {
  const parts = getTimeZoneFormatter(timeZone).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const second = Number(parts.find((part) => part.type === "second")?.value);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    throw new Error("No se pudo resolver la zona horaria del navegador");
  }

  return { year, month, day, hour, minute, second };
};

export const localDateToSortableNumber = (date: LocalDate) =>
  Date.UTC(date.year, date.month - 1, date.day);

export const parseYyyyMmDdToLocalDate = (value: string): LocalDate => {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
};

export const addDays = (date: LocalDate, days: number): LocalDate => {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
};

export const resolveClientTimeContext = (
  input: ClientTimeInput = {}
): ClientTimeContext => {
  const normalizedTimeZone = normalizeClientTimeZone(input.clientTimeZone);
  if (normalizedTimeZone) {
    const nowParts = getDateTimePartsInTimeZone(new Date(), normalizedTimeZone);
    return {
      mode: "timezone",
      timeZone: normalizedTimeZone,
      nowLocalDate: {
        year: nowParts.year,
        month: nowParts.month,
        day: nowParts.day,
      },
      nowMinutes: nowParts.hour * 60 + nowParts.minute,
    };
  }

  const offsetMinutes = normalizeClientTimezoneOffsetMinutes(
    input.clientTimezoneOffsetMinutes
  );
  const shiftedNow = new Date(Date.now() - offsetMinutes * 60 * 1000);

  return {
    mode: "offset",
    offsetMinutes,
    nowLocalDate: {
      year: shiftedNow.getUTCFullYear(),
      month: shiftedNow.getUTCMonth() + 1,
      day: shiftedNow.getUTCDate(),
    },
    nowMinutes: shiftedNow.getUTCHours() * 60 + shiftedNow.getUTCMinutes(),
  };
};

export const localDateTimeToUtc = (
  context: ClientTimeContext,
  localDate: LocalDate,
  localHour: number,
  localMinute: number
): Date => {
  if (context.mode === "offset") {
    return new Date(
      Date.UTC(
        localDate.year,
        localDate.month - 1,
        localDate.day,
        localHour,
        localMinute,
        0,
        0
      ) +
        context.offsetMinutes * 60 * 1000
    );
  }

  const targetLocalMs = Date.UTC(
    localDate.year,
    localDate.month - 1,
    localDate.day,
    localHour,
    localMinute,
    0,
    0
  );

  let utcGuessMs = targetLocalMs;
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const parts = getDateTimePartsInTimeZone(new Date(utcGuessMs), context.timeZone);
    const guessedLocalMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      0
    );
    const diffMs = targetLocalMs - guessedLocalMs;

    if (diffMs === 0) {
      return new Date(utcGuessMs);
    }

    utcGuessMs += diffMs;
  }

  const finalParts = getDateTimePartsInTimeZone(new Date(utcGuessMs), context.timeZone);
  if (
    finalParts.year !== localDate.year ||
    finalParts.month !== localDate.month ||
    finalParts.day !== localDate.day ||
    finalParts.hour !== localHour ||
    finalParts.minute !== localMinute
  ) {
    throw new Error(
      "La hora indicada no existe en tu zona horaria ese día por el cambio de hora"
    );
  }

  return new Date(utcGuessMs);
};

export const getUtcRangeForLocalDate = (
  context: ClientTimeContext,
  localDate: LocalDate
) => {
  const startUtc = localDateTimeToUtc(context, localDate, 0, 0);
  const nextLocalDate = addDays(localDate, 1);
  const nextDayStartUtc = localDateTimeToUtc(context, nextLocalDate, 0, 0);

  return {
    startUtc,
    endUtc: new Date(nextDayStartUtc.getTime() - 1),
  };
};
