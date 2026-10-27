"use server";

import { requireOrganizationMember } from "@/features/auth/permissions";
import { createOpportunity as createOpportunityCommand } from "./commands";

export async function createOpportunity(input: unknown) {
  const actor = await requireOrganizationMember();
  return createOpportunityCommand(actor, input);
}