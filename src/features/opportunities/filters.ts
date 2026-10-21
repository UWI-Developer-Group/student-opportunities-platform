import { z } from "zod";
import { OpportunityCategory, OpportunityType, valuesOf } from "./constants";

// Next gives string | string[] for repeated params; take the first, treat "" as missing.
const first = (value: unknown) => {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "" ? undefined : v;
};

// Invalid URL params are ignored instead of throwing.
const param = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(first, schema.optional()).catch(undefined);

export const opportunityFiltersSchema = z.object({
  q: param(z.string().trim().min(1).max(100)),
  category: param(z.enum(valuesOf(OpportunityCategory))),
  type: param(z.enum(valuesOf(OpportunityType))),
  organization: param(z.string().trim().toLowerCase().min(1).max(100)), // org slug
  deadlineBefore: param(z.coerce.date()),
  page: z.preprocess(first, z.coerce.number().int().min(1).catch(1)),
  limit: z.preprocess(first, z.coerce.number().int().min(1).max(50).catch(12)),
});

export type OpportunityFilters = z.infer<typeof opportunityFiltersSchema>;