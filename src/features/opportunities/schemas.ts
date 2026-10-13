import { z } from "zod";

const safeExternalUrl = z.url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  },
  { message: "URL must use http or https." },
);

export const opportunitySlugSchema = z.string().trim().min(1);

export const publicOpportunityFiltersSchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const createOpportunitySchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: opportunitySlugSchema,
  summary: z.string().trim().min(1).max(300),
  description: z.string().trim().optional(),
  category: z.string().trim().min(1),
  type: z.string().trim().min(1),
  applicationUrl: safeExternalUrl,
  deadline: z.coerce.date().optional(),
});

export type PublicOpportunityFilters = z.infer<
  typeof publicOpportunityFiltersSchema
>;
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
