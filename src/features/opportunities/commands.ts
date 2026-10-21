import "server-only";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Opportunity } from "@/models/Opportunity";
import { Organization, OrganizationStatus } from "@/models/Organization";
import { UserRole } from "@/models/User";
import type { Actor } from "./actor";
import { OpportunityStatus } from "./constants";
import { OpportunityError } from "./errors";
import { createOpportunitySchema, updateOpportunitySchema } from "./schemas";
import { generateUniqueSlug } from "./slug";

export type OpportunityRef = {
  id: string;
  slug: string;
  status: OpportunityStatus;
};

async function requireActiveOrganization(organizationId: string) {
  const organization = await Organization.findById(organizationId).select("status");
  if (!organization) {
    throw new OpportunityError("not_found", "Organization not found");
  }
  if (organization.status !== OrganizationStatus.ACTIVE) {
    throw new OpportunityError("forbidden", "Organization is not active");
  }
}

// Loads an opportunity the actor may manage: admins, or members of the owning organization.
async function loadManageable(id: string, actor: Actor) {
  const opportunity = isValidObjectId(id) ? await Opportunity.findById(id) : null;
  if (!opportunity) {
    throw new OpportunityError("not_found", "Opportunity not found");
  }

  const isAdmin = actor.role === UserRole.ADMIN;
  const isOwner = actor.organizationId === opportunity.organizationId.toString();
  if (!isAdmin && !isOwner) {
    throw new OpportunityError("forbidden", "You cannot manage this opportunity");
  }
  return opportunity;
}

const toRef = (o: { id: string; slug: string; status: OpportunityStatus }): OpportunityRef => ({
  id: o.id,
  slug: o.slug,
  status: o.status,
});

export async function createOpportunity(
  actor: Actor,
  input: unknown,
): Promise<OpportunityRef> {
  if (actor.role !== UserRole.ORG_MEMBER || !actor.organizationId) {
    throw new OpportunityError(
      "forbidden",
      "Only organization members can create opportunities",
    );
  }

  const data = createOpportunitySchema.parse(input);
  await connectToDatabase();
  await requireActiveOrganization(actor.organizationId);

  const opportunity = await Opportunity.create({
    ...data,
    organizationId: actor.organizationId,
    slug: await generateUniqueSlug(data.title),
    status: OpportunityStatus.DRAFT,
  });

  return toRef(opportunity);
}

export async function updateOpportunity(
  actor: Actor,
  id: string,
  input: unknown,
): Promise<OpportunityRef> {
  await connectToDatabase();
  const opportunity = await loadManageable(id, actor);

  // Schema has no slug/status/organizationId, so they can't be changed here.
  opportunity.set(updateOpportunitySchema.parse(input));
  await opportunity.save();

  return toRef(opportunity);
}

export async function publishOpportunity(
  actor: Actor,
  id: string,
): Promise<OpportunityRef> {
  await connectToDatabase();
  const opportunity = await loadManageable(id, actor);
  if (opportunity.status === OpportunityStatus.PUBLISHED) return toRef(opportunity);

  await requireActiveOrganization(opportunity.organizationId.toString());
  createOpportunitySchema.parse(opportunity.toObject()); // must be valid and not expired

  opportunity.status = OpportunityStatus.PUBLISHED;
  opportunity.publishedAt = new Date();
  await opportunity.save();

  return toRef(opportunity);
}

export async function archiveOpportunity(
  actor: Actor,
  id: string,
): Promise<OpportunityRef> {
  await connectToDatabase();
  const opportunity = await loadManageable(id, actor);
  if (opportunity.status === OpportunityStatus.ARCHIVED) return toRef(opportunity);

  opportunity.status = OpportunityStatus.ARCHIVED;
  await opportunity.save();

  return toRef(opportunity);
}