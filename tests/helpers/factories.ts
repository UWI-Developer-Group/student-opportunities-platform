import type { Types } from "mongoose";
import type { Actor } from "@/features/opportunities/actor";
import { OpportunityStatus } from "@/features/opportunities/constants";
import { Opportunity, type IOpportunity } from "@/models/Opportunity";
import { Organization, OrganizationStatus, type IOrganization } from "@/models/Organization";
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

export function actorFor(user: {
  id: string;
  role: UserRole;
  organizationId?: Types.ObjectId;
}): Actor {
  return {
    id: user.id,
    role: user.role,
    organizationId: user.organizationId?.toString(),
  };
}

export const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);