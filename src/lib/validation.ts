import { ZodError, ZodTypeAny, z } from "zod";

const mongoMetadataKeys = new Set(["__v", "createdAt", "updatedAt"]);

const stripMongoInternalFields = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => stripMongoInternalFields(item));
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (mongoMetadataKeys.has(key)) {
        continue;
      }
      out[key] = stripMongoInternalFields(val);
    }
    return out;
  }

  return value;
};

export const toPlainObject = (value: unknown): unknown => {
  const serialized = JSON.parse(JSON.stringify(value));
  return stripMongoInternalFields(serialized);
};

export const parseWithSchema = <TSchema extends ZodTypeAny>(
  schema: TSchema,
  value: unknown
): z.infer<TSchema> => {
  return schema.parse(value);
};

export const isZodError = (error: unknown): error is ZodError => {
  return error instanceof ZodError;
};

export const formatZodError = (error: ZodError): string => {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
};
