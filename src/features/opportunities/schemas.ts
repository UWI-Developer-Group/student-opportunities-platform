import { z } from "zod";
import { OpportunityCategory, OpportunityType, valuesOf } from "./constants";

// Forms send "" for empty inputs; treat as not provided.
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

// http(s) only: .url() alone allows "javascript:" links.
const httpUrl = z
  .string()
  .trim()
  .url({ message: "Must be a valid URL" })
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "URL must start with http:// or https://",
  });

const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// slug, status, publishedAt and organizationId are set by the service, not the user.
const opportunityFields = z.object({
  title: z.string().trim().min(5, "Title is too short").max(160),
  summary: z.string().trim().min(10, "Summary is too short").max(300),
  description: z.string().trim().min(30, "Description is too short").max(10_000),
  category: z.enum(valuesOf(OpportunityCategory), {
    message: "Choose a valid category",
  }),
  type: z.enum(valuesOf(OpportunityType), { message: "Choose a valid type" }),
  location: optional(z.string().trim().max(160)),
  imageUrl: optional(httpUrl),
  applicationUrl: httpUrl,
  additionalLinks: z.array(httpUrl).max(10, "Maximum 10 links").optional(),
  deadline: optional(z.coerce.date()),
});

export const createOpportunitySchema = opportunityFields.refine(
  (data) => !data.deadline || data.deadline >= startOfToday(),
  { path: ["deadline"], message: "Deadline cannot be in the past" }
);

// No past-deadline check, so editing an old listing doesn't fail.
export const updateOpportunitySchema = opportunityFields.partial();

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;