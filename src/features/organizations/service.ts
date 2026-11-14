import "server-only";
import { randomBytes } from "node:crypto";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Organization, OrganizationStatus } from "@/models/Organization";
import { User, UserRole } from "@/models/User";
import { addOrganizationMember, listOrganizationIdsForUser } from "./memberships";
import { organizationDetailsSchema, updateOrganizationSchema } from "./schemas";

export type OrganizationErrorCode =
  | "email_taken"
  | "account_creation_failed"
  | "organization_creation_failed"
  | "forbidden"
  | "not_found"
  | "invalid_status";

export class OrganizationError extends Error {
  constructor(
    readonly code: OrganizationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "OrganizationError";
  }
}

export type OrganizationRef = {
  id: string;
  slug: string;
  status: OrganizationStatus;
};

const toSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "") || "organization";

// Plain slug if free, otherwise add a short random suffix.
async function generateUniqueSlug(name: string): Promise<string> {
  const base = toSlug(name);
  if (!(await Organization.exists({ slug: base }))) return base;
  return `${base}-${randomBytes(3).toString("hex")}`;
}

// Creates a pending organization and makes the user its first member.
// Used by both registration flows: a brand-new account, and a signed-in user adding another.
export async function createPendingOrganization(
  userId: string,
  input: unknown,
): Promise<OrganizationRef> {
  const details = organizationDetailsSchema.parse(input);
  await connectToDatabase();

  const user = isValidObjectId(userId) ? await User.findById(userId) : null;
  if (!user) throw new OrganizationError("not_found", "User not found");
  if (user.role !== UserRole.ORG_MEMBER) {
    throw new OrganizationError("forbidden", "Only organization members can register organizations");
  }

  // Status, slug and verification are never taken from input: a new organization is always pending.
  const organization = await Organization.create({
    name: details.organizationName,
    slug: await generateUniqueSlug(details.organizationName),
    description: details.description,
    websiteUrl: details.websiteUrl,
    contactEmail: details.contactEmail ?? user.email,
    status: OrganizationStatus.PENDING,
  });

  try {
    await addOrganizationMember(user.id, organization.id);
  } catch (error) {
    // An organization nobody belongs to can never be managed, so do not leave it behind.
    await Organization.deleteOne({ _id: organization._id });
    throw error;
  }

  return { id: organization.id, slug: organization.slug, status: organization.status };
}

// Lets a member edit their organization's profile. Only the fields in updateOrganizationSchema
// can change: status, slug, contact email and verification are never touched, whatever the input
// contains. The slug stays the same when the name changes, so public links keep working.
export async function updateOrganization(
  userId: string,
  organizationId: string,
  input: unknown,
): Promise<OrganizationRef> {
  const changes = updateOrganizationSchema.parse(input);
  await connectToDatabase();

  const user =
    isValidObjectId(userId) && isValidObjectId(organizationId)
      ? await User.findById(userId).select("role")
      : null;
  const isMember =
    user?.role === UserRole.ORG_MEMBER &&
    (await listOrganizationIdsForUser(userId)).includes(organizationId);
  if (!isMember) {
    throw new OrganizationError("forbidden", "You do not belong to this organization");
  }

  const organization = await Organization.findById(organizationId);
  if (!organization) throw new OrganizationError("not_found", "Organization not found");

  if (changes.name !== undefined) organization.name = changes.name;
  if (changes.description !== undefined) organization.description = changes.description;
  // A blank link is removed rather than stored as an empty string.
  if (changes.websiteUrl !== undefined) organization.websiteUrl = changes.websiteUrl || undefined;
  if (changes.logoUrl !== undefined) organization.logoUrl = changes.logoUrl || undefined;
  await organization.save();

  return { id: organization.id, slug: organization.slug, status: organization.status };
}

// Which statuses each admin decision may start from. Anything else is refused, so an admin
// cannot, for example, "reject" an organization that is already live (that is what suspend is for).
// Approving also reinstates suspended organizations and reverses a mistaken rejection.
const STATUS_CHANGES = {
  approve: { to: OrganizationStatus.ACTIVE, from: [OrganizationStatus.PENDING, OrganizationStatus.REJECTED, OrganizationStatus.SUSPENDED], done: "approved" },
  reject: { to: OrganizationStatus.REJECTED, from: [OrganizationStatus.PENDING], done: "rejected" },
  suspend: { to: OrganizationStatus.SUSPENDED, from: [OrganizationStatus.ACTIVE], done: "suspended" },
} as const;

async function changeOrganizationStatus(
  adminId: string,
  organizationId: string,
  change: keyof typeof STATUS_CHANGES,
): Promise<OrganizationRef> {
  await connectToDatabase();

  // Same rule as requireAdmin in auth/permissions.ts. Being a member of an organization
  // never makes someone an admin.
  const admin = isValidObjectId(adminId) ? await User.findById(adminId).select("role") : null;
  if (!admin || admin.role !== UserRole.ADMIN) {
    throw new OrganizationError("forbidden", "Only admins can change an organization's status");
  }
  if (!isValidObjectId(organizationId)) {
    throw new OrganizationError("not_found", "Organization not found");
  }

  const { to, from, done } = STATUS_CHANGES[change];
  // One atomic update that also checks the current status, so two admins acting at the same
  // moment cannot both succeed. Only approval records who verified the organization.
  const organization = await Organization.findOneAndUpdate(
    { _id: organizationId, status: { $in: [...from] } },
    { $set: to === OrganizationStatus.ACTIVE ? { status: to, verifiedAt: new Date(), verifiedBy: admin._id } : { status: to } },
    { new: true },
  );

  if (!organization) {
    const current = await Organization.findById(organizationId).select("status");
    if (!current) throw new OrganizationError("not_found", "Organization not found");
    throw new OrganizationError(
      "invalid_status",
      `This organization is ${current.status}, so it cannot be ${done}`,
    );
  }

  return { id: organization.id, slug: organization.slug, status: organization.status };
}

export const approveOrganization = (adminId: string, organizationId: string) =>
  changeOrganizationStatus(adminId, organizationId, "approve");
export const rejectOrganization = (adminId: string, organizationId: string) =>
  changeOrganizationStatus(adminId, organizationId, "reject");
export const suspendOrganization = (adminId: string, organizationId: string) =>
  changeOrganizationStatus(adminId, organizationId, "suspend");