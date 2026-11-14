import "server-only";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Organization, OrganizationStatus } from "@/models/Organization";

// What public pages are allowed to see. Internal fields (verifiedBy, verifiedAt, contactEmail)
// are left out on purpose.
export type OrganizationProfile = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  createdAt: Date;
};

const PUBLIC_FIELDS = "name slug description logoUrl websiteUrl createdAt";

// Only active organizations are visible. The status filter is part of the query itself, so
// pending, rejected and suspended organizations are never fetched, and callers cannot tell
// a hidden organization from one that does not exist.
type PublicDoc = {
  _id: { toString(): string };
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  createdAt: Date;
};

function toProfile(doc: PublicDoc): OrganizationProfile {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    logoUrl: doc.logoUrl,
    websiteUrl: doc.websiteUrl,
    createdAt: doc.createdAt,
  };
}

// Returns null when the organization is missing, the id is malformed, or it is not active.
export async function getOrganization(id: string): Promise<OrganizationProfile | null> {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();

  const doc = await Organization.findOne({ _id: id, status: OrganizationStatus.ACTIVE })
    .select(PUBLIC_FIELDS)
    .lean();
  return doc ? toProfile(doc) : null;
}

// Slugs are stored lowercase and trimmed, so the lookup is normalised the same way.
export async function getOrganizationBySlug(slug: string): Promise<OrganizationProfile | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  await connectToDatabase();

  const doc = await Organization.findOne({ slug: normalized, status: OrganizationStatus.ACTIVE })
    .select(PUBLIC_FIELDS)
    .lean();
  return doc ? toProfile(doc) : null;
}