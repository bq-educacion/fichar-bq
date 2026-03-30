import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import {
  ianaTimezoneSchema,
  projectDedicationInputSchema,
  timezoneOffsetMinutesSchema,
} from "@/schemas/api";
import { logCreateSchema, logSchema, logTypeEnumSchema } from "@/schemas/db";
import { LOG_TYPE, Log } from "@/types";
import { z } from "zod";
import {
  clearProjectDedicationsForToday,
  saveProjectDedicationsForToday,
} from "./projectDedications";
import updateUserStatus from "./updateUserStatus";
import {
  type ClientTimeInput,
  getUtcRangeForLocalDate,
  getLocalDateForUtcDate,
  localDateToYyyyMmDd,
  resolveClientTimeContext,
} from "@/lib/clientTime";

const addLogInputSchema = z
  .object({
    email: z.string().email(),
    type: logTypeEnumSchema,
    isMobile: z.boolean(),
    projectDedications: z.array(projectDedicationInputSchema).default([]),
    clientTimezoneOffsetMinutes: timezoneOffsetMinutesSchema.optional(),
    clientTimeZone: ianaTimezoneSchema.optional(),
  })
  .strict();

export class PreviousDayNotClosedError extends Error {
  public readonly targetDate: string;

  constructor(targetDate: string) {
    super("PREVIOUS_DAY_NOT_CLOSED");
    this.name = "PreviousDayNotClosedError";
    this.targetDate = targetDate;
  }
}

const createValidatedLog = async (data: z.input<typeof logCreateSchema>) => {
  const payload = parseWithSchema(logCreateSchema, data);
  return await LogModel.create(payload);
};

const addLog = async (
  email: string,
  type: LOG_TYPE,
  isMobile: boolean,
  projectDedications: z.infer<typeof projectDedicationInputSchema>[] = [],
  clientTimeInput: ClientTimeInput = {}
): Promise<Log> => {
  const input = parseWithSchema(addLogInputSchema, {
    email,
    type,
    isMobile,
    projectDedications,
    clientTimezoneOffsetMinutes: clientTimeInput.clientTimezoneOffsetMinutes,
    clientTimeZone: clientTimeInput.clientTimeZone,
  });

  if (input.type !== LOG_TYPE.out && input.projectDedications.length > 0) {
    throw new Error("Bad Request");
  }

  await connectMongo();

  const lastLog = await LogModel.findOne({ user: input.email })
    .sort({ date: -1 })
    .exec();

  if (!lastLog) {
    const log = await createValidatedLog({
      type: LOG_TYPE.in,
      isMobile: input.isMobile,
      date: new Date(),
      user: input.email,
    });

    await updateUserStatus(input.email);
    return parseWithSchema(logSchema, toPlainObject(log));
  }

  const context = resolveClientTimeContext(input);
  const startOfToday = getUtcRangeForLocalDate(context, context.nowLocalDate).startUtc;
  const isLastLogFromPreviousDay = lastLog.date < startOfToday;

  if (isLastLogFromPreviousDay) {
    if (lastLog.type !== LOG_TYPE.out && input.type === LOG_TYPE.in) {
      throw new PreviousDayNotClosedError(
        localDateToYyyyMmDd(getLocalDateForUtcDate(context, lastLog.date))
      );
    }

    if (input.type !== LOG_TYPE.in) {
      throw new Error("Bad Request");
    }
  }

  if (input.type === LOG_TYPE.goback) {
    if (lastLog.type !== LOG_TYPE.out) {
      throw new Error("Bad Request");
    }

    lastLog.type = LOG_TYPE.pause;
    await lastLog.save();

    const log = await createValidatedLog({
      type: LOG_TYPE.in,
      isMobile: input.isMobile,
      date: new Date(),
      user: input.email,
    });

    await clearProjectDedicationsForToday(input.email, input);
    await updateUserStatus(input.email);
    return parseWithSchema(logSchema, toPlainObject(log));
  }

  if (input.type === LOG_TYPE.pause && lastLog.type !== LOG_TYPE.in) {
    throw new Error("Bad Request");
  }

  if (input.type === LOG_TYPE.out && lastLog.type !== LOG_TYPE.in) {
    throw new Error("Bad Request");
  }

  if (
    input.type === LOG_TYPE.in &&
    ![LOG_TYPE.pause, LOG_TYPE.out].includes(lastLog.type)
  ) {
    throw new Error("Bad Request");
  }

  const log = await createValidatedLog({
    type: input.type,
    date: new Date(),
    user: input.email,
    isMobile: input.isMobile,
  });

  if (input.type === LOG_TYPE.out) {
    try {
      await saveProjectDedicationsForToday(input.email, input.projectDedications, input);
    } catch (error) {
      await LogModel.deleteOne({ _id: log._id }).exec();
      throw error;
    }
  }

  await updateUserStatus(input.email);
  return parseWithSchema(logSchema, toPlainObject(log));
};

export default addLog;
