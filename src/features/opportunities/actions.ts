"use server";

import { requireOrganizationMember, requireUser } from "@/features/auth/permissions";
import {
  createOpportunity as createOpportunityCommand,
  publishOpportunity as publishOpportunityCommand,
  updateOpportunity as updateOpportunityCommand,
} from "./commands";

export async function createOpportunity(input: unknown) {
  const actor = await requireOrganizationMember();
  const organizationId = actor.organizationIds[0];
  return createOpportunityCommand(actor, organizationId, input);
}

export async function updateOpportunity(id: string, input: unknown) {
  const actor = await requireUser();
  return updateOpportunityCommand(actor, id, input);
}

export async function publishOpportunity(id: string) {
  const actor = await requireUser();
  return publishOpportunityCommand(actor, id);
}