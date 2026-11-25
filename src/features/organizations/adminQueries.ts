import "server-only";
import { requireAdmin } from "@/features/auth/permissions";
import { connectToDatabase } from "@/lib/db";
import { Organization, OrganizationStatus } from "@/models/Organization";

// Everything an admin needs to decide on a registration. Unlike the public profile it includes
// the contact email, which is why this query is admin-only and lives apart from queries.ts.
export type PendingOrganization = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  contactEmail: string;
  websiteUrl?: string;
  logoUrl?: string;
  createdAt: Date;
};

// Organizations waiting for review, oldest registration first. Read-only.
// Authorization is checked here, so hiding the admin page is not what protects this data.
export async function listPendingOrganizations(): Promise<
  PendingOrganization[]
> {
  await requireAdmin();
  await connectToDatabase();

  const docs = await Organization.find({ status: OrganizationStatus.PENDING })
    .select("name slug description contactEmail websiteUrl logoUrl createdAt")
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    contactEmail: doc.contactEmail,
    websiteUrl: doc.websiteUrl,
    logoUrl: doc.logoUrl,
    createdAt: doc.createdAt,
  }));
}
