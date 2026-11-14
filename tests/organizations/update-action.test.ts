import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Organization } from "@/models/Organization";
import { OrganizationMembership } from "@/models/OrganizationMembership";
import { User, UserRole } from "@/models/User";
import { clearTestDb, startTestReplicaSetDb, stopTestDb } from "../helpers/db";
import { createOrganization } from "../helpers/factories";

// No real HTTP request in tests, so next/headers is faked and the session cookie is set by hand.
const state = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({
  headers: async () => state.headers,
  cookies: async () => ({ set: () => undefined, get: () => undefined }),
}));

const PASSWORD = "a-long-test-password-123";

// lib/auth.ts reads MONGODB_URI when it loads, so everything that uses it is imported after the database starts.
let auth: typeof import("@/lib/auth").auth;
let updateOrganizationAction: typeof import("@/features/organizations/actions").updateOrganizationAction;

beforeAll(async () => {
  await startTestReplicaSetDb();
  ({ auth } = await import("@/lib/auth"));
  ({ updateOrganizationAction } = await import("@/features/organizations/actions"));
});
afterAll(stopTestDb);

beforeEach(async () => {
  await clearTestDb();
  const db = mongoose.connection.db!;
  await Promise.all(
    ["user", "session", "account", "verification"].map((name) => db.collection(name).deleteMany({})),
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

// Signs up a person, makes them a member of the given organizations, and signs them in.
async function signedInMemberOf(...organizations: { _id: mongoose.Types.ObjectId }[]) {
  const { authUserId, cookie } = await signUp("member@test.dev");
  const user = (await User.findOne({ authProviderId: authUserId }))!;
  for (const organization of organizations) {
    await OrganizationMembership.create({ userId: user._id, organizationId: organization._id });
  }
  signInWith(cookie);
  return user;
}

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("updateOrganizationAction", () => {
  it("saves the profile for a signed-in member", async () => {
    const org = await createOrganization();
    await signedInMemberOf(org);

    const result = await updateOrganizationAction(org.id, undefined, form({ name: "Renamed Club" }));

    expect(result).toMatchObject({ success: true });
    expect((await Organization.findById(org.id))?.name).toBe("Renamed Club");
  });

  it("ignores the hidden fields Next.js adds to form submissions", async () => {
    const org = await createOrganization();
    await signedInMemberOf(org);

    const result = await updateOrganizationAction(
      org.id,
      undefined,
      form({ name: "Renamed Club", $ACTION_ID_abc123: "" }),
    );

    expect(result).toMatchObject({ success: true });
  });

  it("does not let a member of organization A edit organization B", async () => {
    const [a, b] = [await createOrganization(), await createOrganization()];
    await signedInMemberOf(a);

    const result = await updateOrganizationAction(b.id, undefined, form({ name: "Hijacked" }));

    expect(result).toMatchObject({ message: "You are not allowed to do that." });
    expect(result).not.toMatchObject({ success: true });
    expect((await Organization.findById(b.id))?.name).toBe(b.name);
  });

  it("asks a signed-out visitor to sign in", async () => {
    const org = await createOrganization();

    const result = await updateOrganizationAction(org.id, undefined, form({ name: "Nope" }));

    expect(result).toMatchObject({ message: "Please sign in to continue." });
    expect((await Organization.findById(org.id))?.name).toBe(org.name);
  });

  it("does not let an admin edit, even with a membership row", async () => {
    const org = await createOrganization();
    const user = await signedInMemberOf(org);
    await User.updateOne({ _id: user._id }, { $set: { role: UserRole.ADMIN } });

    const result = await updateOrganizationAction(org.id, undefined, form({ name: "Nope" }));

    expect(result).toMatchObject({ message: "You are not allowed to do that." });
    expect((await Organization.findById(org.id))?.name).toBe(org.name);
  });

  it("returns field errors and the submitted values for invalid input", async () => {
    const org = await createOrganization();
    await signedInMemberOf(org);

    const result = await updateOrganizationAction(
      org.id,
      undefined,
      form({ name: "A", websiteUrl: "javascript:alert(1)" }),
    );

    expect(result?.success).toBeUndefined();
    expect(result?.fieldErrors).toHaveProperty("name");
    expect(result?.fieldErrors).toHaveProperty("websiteUrl");
    expect(result?.values).toMatchObject({ name: "A", websiteUrl: "javascript:alert(1)" });
    expect((await Organization.findById(org.id))?.name).toBe(org.name);
  });
});