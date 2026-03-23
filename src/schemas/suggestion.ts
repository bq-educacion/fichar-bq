import { dateSchema, mongoIdSchema } from "@/schemas/db";
import { z } from "zod";

export const MAX_SUGGESTION_LENGTH = 2000;

export const suggestionTextSchema = z
  .string()
  .trim()
  .min(1, "Escribe una sugerencia o queja laboral")
  .max(
    MAX_SUGGESTION_LENGTH,
    `El mensaje no puede superar los ${MAX_SUGGESTION_LENGTH} caracteres`
  );

export const suggestionPrivacyAcceptedSchema = z
  .boolean()
  .refine(
    (value) => value,
    "Debes aceptar la política de privacidad correspondiente"
  );

export const suggestionSchema = z
  .object({
    _id: mongoIdSchema,
    text: suggestionTextSchema,
    date: dateSchema,
    archived: z.boolean().default(false),
  })
  .strict();

export const suggestionsResponseSchema = z.array(suggestionSchema);

export const suggestionCreateSchema = z
  .object({
    text: suggestionTextSchema,
    privacyAccepted: suggestionPrivacyAcceptedSchema,
  })
  .strict();

export const suggestionUpdateSchema = z
  .object({
    id: mongoIdSchema,
    archived: z.boolean(),
  })
  .strict();

export const suggestionArchivedQuerySchema = z.enum(["true", "false"]).optional();

export type Suggestion = z.infer<typeof suggestionSchema>;
export type SuggestionCreate = z.infer<typeof suggestionCreateSchema>;
export type SuggestionUpdate = z.infer<typeof suggestionUpdateSchema>;
