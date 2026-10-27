import "server-only";
import { randomBytes } from "node:crypto";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Organization, OrganizationStatus } from "@/models/Organization";
import { User, UserRole } from "@/models/User";
import { addOrganizationMember } from "./memberships";
import { organizationDetailsSchema } from "./schemas";

export type OrganizationErrorCode =
  | "email_taken"
  | "account_creation_failed"
  | "organization_creation_failed"
  | "forbidden"
  | "not_found";

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