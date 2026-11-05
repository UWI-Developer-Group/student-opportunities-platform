import "server-only";
import { opportunityFiltersSchema } from "./filters";
import { findPublicOpportunityBySlug, listPublicOpportunities as queryPublicOpportunities } from "./queries";

// Accepts raw URL params, e.g. await searchParams, or { category: "internship" }.
export async function listPublicOpportunities(rawFilters: unknown = {}) {
  const filters = opportunityFiltersSchema.parse(rawFilters ?? {});
  return queryPublicOpportunities(filters);
}

export async function getPublicOpportunity(slug: string) {
  return findPublicOpportunityBySlug(slug);
}