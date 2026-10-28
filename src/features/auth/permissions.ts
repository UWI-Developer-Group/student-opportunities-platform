import "server-only";
import { isValidObjectId } from "mongoose";
import { cache } from "react";
import { listOrganizationIdsForUser } from "@/features/organizations/memberships";
import { connectToDatabase } from "@/lib/db";
import { User, UserRole } from "@/models/User";
import { AuthError } from "./errors";
import { getSessionUserId } from "./session";

// Structurally compatible with the opportunity commands' Actor.
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationIds: string[];
};

// Cached per request, so several helpers in one request hit the database once.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const userId = await getSessionUserId();
  if (!userId || !isValidObjectId(userId)) return null;

  await connectToDatabase();
  const user = await User.findById(userId).lean();
  if (!user) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    organizationIds: await listOrganizationIdsForUser(userId),
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("unauthenticated", "You must be signed in");
  return user;
}

// Signed in AND a member of this specific organization. Admins are not members by default.
export async function requireOrganizationMember(
  organizationId: string,
): Promise<CurrentUser> {
  const user = await requireUser();
  if (
    user.role !== UserRole.ORG_MEMBER ||
    !user.organizationIds.includes(organizationId)
  ) {
    throw new AuthError("forbidden", "You are not a member of this organization");
  }
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== UserRole.ADMIN) {
    throw new AuthError("forbidden", "Admins only");
  }
  return user;
}
