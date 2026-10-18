import "server-only";
import { opportunityFiltersSchema } from "./filters";
import { findPublicOpportunities, findPublicOpportunityBySlug } from "./queries";

// Accepts raw URL params, e.g. await searchParams, or { category: "internship" }.
export async function listPublicOpportunities(rawFilters: unknown = {}) {
  const filters = opportunityFiltersSchema.parse(rawFilters ?? {});
  return findPublicOpportunities(filters);
}

export async function getPublicOpportunity(slug: string) {
  return findPublicOpportunityBySlug(slug);
}