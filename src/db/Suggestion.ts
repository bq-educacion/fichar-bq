import { MAX_SUGGESTION_LENGTH } from "@/schemas/suggestion";
import mongoose from "mongoose";

const SuggestionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_SUGGESTION_LENGTH,
    },
    date: { type: Date, required: true, default: Date.now, index: true },
    archived: { type: Boolean, default: false, index: true },
  },
  {
    id: false,
    versionKey: false,
  },
);

export const SuggestionModel =
  mongoose.models.Suggestion || mongoose.model("Suggestion", SuggestionSchema);
