import type { Types } from "mongoose";
import type { Actor } from "@/features/opportunities/actor";
import { OpportunityStatus } from "@/features/opportunities/constants";
import { listOrganizationIdsForUser } from "@/features/organizations/memberships";
import { Opportunity, type IOpportunity } from "@/models/Opportunity";
import { Organization, OrganizationStatus, type IOrganization } from "@/models/Organization";
import { OrganizationMembership } from "@/models/OrganizationMembership";
import { User, UserRole, type IUser } from "@/models/User";

let counter = 0;
const next = () => ++counter;

export async function createOrganization(overrides: Partial<IOrganization> = {}) {
  const n = next();
  return Organization.create({
    name: `Org ${n}`,
    slug: `org-${n}`,
    contactEmail: `org${n}@test.dev`,
    status: OrganizationStatus.ACTIVE,
    ...overrides,
  });
}

// Defaults to a published listing, since most tests start from a visible one.
export async function createOpportunityFixture(
  organizationId: Types.ObjectId | string,
  overrides: Partial<IOpportunity> = {},
) {
  const n = next();
  return Opportunity.create({
    title: `Opportunity ${n}`,
    slug: `opportunity-${n}`,
    summary: "A short summary of the opportunity.",
    description: "A description that is comfortably longer than thirty characters.",
    organizationId,
    category: "internship",
    type: "online",
    applicationUrl: "https://example.com/apply",
    status: OpportunityStatus.PUBLISHED,
    publishedAt: new Date(),
    ...overrides,
  });
}

export async function createUser(overrides: Partial<IUser> = {}) {
  const n = next();
  return User.create({
    name: `User ${n}`,
    email: `user${n}@test.dev`,
    role: UserRole.ORG_MEMBER,
    ...overrides,
  });
}

export async function createMembership(
  userId: Types.ObjectId | string,
  organizationId: Types.ObjectId | string,
) {
  return OrganizationMembership.create({ userId, organizationId });
}

// An org_member who belongs to every organization given.
export async function createMemberOf(
  ...organizations: { _id: Types.ObjectId }[]
) {
  const user = await createUser();
  for (const organization of organizations) {
    await createMembership(user._id, organization._id);
  }
  return user;
}

// Builds the Actor the same way the app does: memberships come from the database.
export async function actorFor(user: { id: string; role: UserRole }): Promise<Actor> {
  return {
    id: user.id,
    role: user.role,
    organizationIds: await listOrganizationIdsForUser(user.id),
  };
}

export const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);