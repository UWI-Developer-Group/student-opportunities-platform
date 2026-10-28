import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

// Returns OUR user's id for whoever is signed in, or null.
// Better Auth proves who the person is; the User model decides what they may do.
// null means signed out, or signed in but with no linked User record.
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  await connectToDatabase();
  const user = await User.findOne({ authProviderId: session.user.id }).select("_id");
  return user ? user.id : null;
}