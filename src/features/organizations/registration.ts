import "server-only";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { registerOrganizationSchema, type RegisterOrganizationInput } from "./schemas";
import { createPendingOrganization, OrganizationError, type OrganizationRef } from "./service";

// Better Auth reports a duplicate email as an error with a code or message like "user already exists".
function isEmailTakenError(error: unknown): boolean {
  const { body } = error as { body?: { code?: string; message?: string } };
  return /already[_ ]exist/i.test(`${body?.code ?? ""} ${body?.message ?? ""}`);
}

async function createAccount({ name, email, password }: RegisterOrganizationInput) {
  try {
    const { user } = await auth.api.signUpEmail({ body: { name, email, password } });
    return user.id;
  } catch (error) {
    if (isEmailTakenError(error)) {
      throw new OrganizationError("email_taken", "An account with this email already exists", {
        cause: error,
      });
    }
    throw new OrganizationError("account_creation_failed", "Could not create the account", {
      cause: error,
    });
  }
}

// A new person registers an account and an organization together.
// Account and organization live in different systems, so there is no single transaction:
// everything that can be checked is checked first, and a failure after the account exists
// is reported clearly so the person can sign in and register the organization again.
export async function registerOrganization(
  input: unknown,
): Promise<{ userId: string; organization: OrganizationRef }> {
  const data = registerOrganizationSchema.parse(input);
  await connectToDatabase();

  // The common failure, caught before anything is created.
  if (await User.exists({ email: data.email })) {
    throw new OrganizationError("email_taken", "An account with this email already exists");
  }

  const authUserId = await createAccount(data);

  // Better Auth's sign-up hook creates our User; it is what memberships attach to.
  const user = await User.findOne({ authProviderId: authUserId }).select("_id");
  if (!user) {
    throw new OrganizationError(
      "account_creation_failed",
      "The account was created but could not be set up. Please contact support.",
    );
  }

  try {
    const organization = await createPendingOrganization(user.id, data);
    return { userId: user.id, organization };
  } catch (error) {
    throw new OrganizationError(
      "organization_creation_failed",
      "Your account was created, but the organization could not be saved. Sign in and register it again.",
      { cause: error },
    );
  }
}