import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import { parseWithSchema, toPlainObject } from "@/lib/validation";
import { logCreateSchema, logSchema, logTypeEnumSchema } from "@/schemas/db";
import { LOG_TYPE, Log } from "@/types";
import { z } from "zod";
import updateUserStatus from "./updateUserStatus";

const addLogInputSchema = z
  .object({
    email: z.string().email(),
    type: logTypeEnumSchema,
    isMobile: z.boolean(),
  })
  .strict();

const createValidatedLog = async (data: z.input<typeof logCreateSchema>) => {
  const payload = parseWithSchema(logCreateSchema, data);
  return await LogModel.create(payload);
};

const addLog = async (
  email: string,
  type: LOG_TYPE,
  isMobile: boolean
): Promise<Log> => {
  const input = parseWithSchema(addLogInputSchema, { email, type, isMobile });

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

  if (
    lastLog.date < new Date(new Date().setHours(0, 0, 0, 0)) &&
    input.type !== LOG_TYPE.out
  ) {
    if (lastLog.type === LOG_TYPE.in) {
      const midnight = new Date(new Date().setHours(0, 0, 0, 0));
      const outDate = new Date(midnight.getTime() - 1);
      const inDate = new Date(midnight.getTime() + 1);

      await createValidatedLog({
        type: LOG_TYPE.out,
        isMobile: input.isMobile,
        date: outDate,
        user: input.email,
      });

      const reopenedLog = await createValidatedLog({
        type: LOG_TYPE.in,
        isMobile: input.isMobile,
        date: inDate,
        user: input.email,
      });

      await updateUserStatus(input.email);
      return parseWithSchema(logSchema, toPlainObject(reopenedLog));
    }

    if (lastLog.type === LOG_TYPE.pause) {
      lastLog.type = LOG_TYPE.out;
      await lastLog.save();

      const resumedLog = await createValidatedLog({
        type: LOG_TYPE.in,
        isMobile: input.isMobile,
        date: new Date(),
        user: input.email,
      });

      await updateUserStatus(input.email);
      return parseWithSchema(logSchema, toPlainObject(resumedLog));
    }
  }

  if (
    lastLog.date < new Date(new Date().setHours(0, 0, 0, 0)) &&
    input.type !== LOG_TYPE.in
  ) {
    throw new Error("Bad Request");
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

  await updateUserStatus(input.email);
  return parseWithSchema(logSchema, toPlainObject(log));
};

export default addLog;
