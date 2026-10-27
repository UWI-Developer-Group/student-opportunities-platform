import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { OrganizationMembership } from "@/models/OrganizationMembership";

const DUPLICATE_KEY_ERROR = 11000;

export async function listOrganizationIdsForUser(userId: string): Promise<string[]> {
  await connectToDatabase();
  const memberships = await OrganizationMembership.find({ userId })
    .select("organizationId")
    .lean();
  return memberships.map((m) => m.organizationId.toString());
}

// Safe to call twice: returns false (instead of throwing) if the membership already exists.
export async function addOrganizationMember(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  await connectToDatabase();
  try {
    await OrganizationMembership.create({
      userId: new Types.ObjectId(userId),
      organizationId: new Types.ObjectId(organizationId),
    });
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === DUPLICATE_KEY_ERROR) return false;
    throw error;
  }
}