import "server-only";
import {
  findPublicOpportunities,
  findPublicOpportunityBySlug,
} from "@/features/opportunities/queries";

export async function listPublicOpportunities() {
  return findPublicOpportunities();
}

export async function getPublicOpportunity(slug: string) {
  return findPublicOpportunityBySlug(slug);
}
