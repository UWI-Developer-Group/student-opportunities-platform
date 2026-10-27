import "server-only";

import { headers } from "next/headers";
import { OpportunityError } from "@/features/opportunities/errors";
import type { Actor } from "@/features/opportunities/actor";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User, UserRole } from "@/models/User";

export async function requireOrganizationMember(): Promise<Actor> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new OpportunityError("forbidden", "Authentication is required");
  }

  await connectToDatabase();
  const user = await User.findOne({ authProviderId: session.user.id }).select(
    "_id role organizationId",
  );
  if (user?.role !== UserRole.ORG_MEMBER || !user.organizationId) {
    throw new OpportunityError(
      "forbidden",
      "Only organization members can create opportunities",
    );
  }

  return {
    id: user.id,
    role: user.role,
    organizationId: user.organizationId.toString(),
  };
}
