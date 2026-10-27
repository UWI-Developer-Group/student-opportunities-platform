// End-to-end check of the auth chain, with the real Better Auth and no mocked session:
// sign-up -> hook creates our User -> session cookie -> session.ts -> permissions.ts.
// Only next/headers is faked, because tests have no real HTTP request.
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationMembership } from "@/models/OrganizationMembership";
import { User, UserRole } from "@/models/User";
import { clearTestDb, startTestReplicaSetDb, stopTestDb } from "../helpers/db";
import { createOrganization, createUser } from "../helpers/factories";

const state = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({ headers: async () => state.headers }));

const PASSWORD = "a-long-test-password-123";

// lib/auth.ts reads MONGODB_URI when it loads, so it is imported after the test database starts.
let auth: typeof import("@/lib/auth").auth;
let permissions: typeof import("@/features/auth/permissions");

beforeAll(async () => {
  await startTestReplicaSetDb();
  ({ auth } = await import("@/lib/auth"));
  permissions = await import("@/features/auth/permissions");
});
afterAll(stopTestDb);

beforeEach(async () => {
  await clearTestDb();
  const db = mongoose.connection.db!;
  await Promise.all(
    ["user", "session", "account", "verification"].map((name) =>
      db.collection(name).deleteMany({}),
    ),
  );
  signInWith(null);
});

function signInWith(cookie: string | null) {
  state.headers = new Headers(cookie ? { cookie } : {});
}

async function signUp(email: string) {
  const { headers, response } = await auth.api.signUpEmail({
    body: { name: "Test Person", email, password: PASSWORD },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { authUserId: response.user.id, cookie };
}

describe("signed out", () => {
  it("has no current user and is denied everywhere", async () => {
    expect(await permissions.getCurrentUser()).toBeNull();
    await expect(permissions.requireUser()).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(permissions.requireAdmin()).rejects.toMatchObject({ code: "unauthenticated" });
  });
});

describe("sign-up", () => {
  it("creates our User, linked to the Better Auth account, as an org member", async () => {
    const { authUserId } = await signUp("new-person@test.dev");

    const user = await User.findOne({ authProviderId: authUserId });
    expect(user).toMatchObject({ email: "new-person@test.dev", role: UserRole.ORG_MEMBER });
  });
});

describe("a signed-in member", () => {
  it("is recognised, with no organizations yet, and is not an admin", async () => {
    const { cookie } = await signUp("member@test.dev");
    signInWith(cookie);

    expect(await permissions.getCurrentUser()).toMatchObject({
      email: "member@test.dev",
      role: UserRole.ORG_MEMBER,
      organizationIds: [],
    });
    await expect(permissions.requireAdmin()).rejects.toMatchObject({ code: "forbidden" });
  });

  it("can act only for organizations they belong to", async () => {
    const { authUserId, cookie } = await signUp("member@test.dev");
    const mine = await createOrganization();
    const other = await createOrganization();
    const user = await User.findOne({ authProviderId: authUserId });
    await OrganizationMembership.create({ userId: user!._id, organizationId: mine._id });
    signInWith(cookie);

    await expect(permissions.requireOrganizationMember(mine.id)).resolves.toBeDefined();
    await expect(permissions.requireOrganizationMember(other.id)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("is treated as signed out if their User record is gone", async () => {
    const { authUserId, cookie } = await signUp("orphan@test.dev");
    await User.deleteOne({ authProviderId: authUserId });
    signInWith(cookie);

    expect(await permissions.getCurrentUser()).toBeNull();
  });
});

describe("an admin", () => {
  it("passes requireAdmin but is not an organization member", async () => {
    const { authUserId, cookie } = await signUp("admin@test.dev");
    await User.updateOne({ authProviderId: authUserId }, { $set: { role: UserRole.ADMIN } });
    const organization = await createOrganization();
    signInWith(cookie);

    await expect(permissions.requireAdmin()).resolves.toMatchObject({ role: UserRole.ADMIN });
    await expect(permissions.requireOrganizationMember(organization.id)).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("account takeover", () => {
  it("does not link a new sign-up to an existing account that has the same email", async () => {
    await createUser({ email: "boss@test.dev", role: UserRole.ADMIN });

    // Sign-up may be rejected or accepted; either way it must not inherit the admin account.
    const attempt = await signUp("boss@test.dev").catch(() => null);
    if (attempt) {
      signInWith(attempt.cookie);
      expect(await permissions.getCurrentUser()).toBeNull();
    }

    expect(await User.countDocuments({ email: "boss@test.dev", authProviderId: { $exists: true } })).toBe(0);
  });
});