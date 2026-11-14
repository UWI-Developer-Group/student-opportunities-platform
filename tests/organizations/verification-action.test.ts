import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Organization, OrganizationStatus } from "@/models/Organization";
import { OrganizationMembership } from "@/models/OrganizationMembership";
import { User, UserRole } from "@/models/User";
import { clearTestDb, startTestReplicaSetDb, stopTestDb } from "../helpers/db";
import { createOrganization } from "../helpers/factories";

const state = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({
  headers: async () => state.headers,
  cookies: async () => ({ set: () => undefined, get: () => undefined }),
}));

const PASSWORD = "a-long-test-password-123";
const { PENDING, ACTIVE, REJECTED, SUSPENDED } = OrganizationStatus;

let auth: typeof import("@/lib/auth").auth;
let actions: typeof import("@/features/organizations/actions");

beforeAll(async () => {
  await startTestReplicaSetDb();
  ({ auth } = await import("@/lib/auth"));
  actions = await import("@/features/organizations/actions");
});
afterAll(stopTestDb);

beforeEach(async () => {
  await clearTestDb();
  const db = mongoose.connection.db!;
  await Promise.all(
    ["user", "session", "account", "verification"].map((name) => db.collection(name).deleteMany({})),
  );
  state.headers = new Headers();
});

// Signs up a person with the given role and signs them in.
async function signInAs(role: UserRole) {
  const { headers, response } = await auth.api.signUpEmail({
    body: { name: "Test Person", email: "person@test.dev", password: PASSWORD },
    returnHeaders: true,
  });
  const cookie = headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const user = (await User.findOne({ authProviderId: response.user.id }))!;
  await User.updateOne({ _id: user._id }, { $set: { role } });
  state.headers = new Headers({ cookie });
  return user;
}

const statusOf = async (id: string) => (await Organization.findById(id))?.status;

const cases = [
  ["approveOrganizationAction", PENDING, ACTIVE],
  ["rejectOrganizationAction", PENDING, REJECTED],
  ["suspendOrganizationAction", ACTIVE, SUSPENDED],
] as const;

describe.each(cases)("%s", (name, startsAs, endsAs) => {
  it("changes the status when an admin submits it", async () => {
    const org = await createOrganization({ status: startsAs });
    await signInAs(UserRole.ADMIN);

    const result = await actions[name](org.id, undefined, new FormData());

    expect(result).toMatchObject({ success: true });
    expect(await statusOf(org.id)).toBe(endsAs);
  });

  it("refuses a signed-in member of that organization", async () => {
    const org = await createOrganization({ status: startsAs });
    const user = await signInAs(UserRole.ORG_MEMBER);
    await OrganizationMembership.create({ userId: user._id, organizationId: org._id });

    const result = await actions[name](org.id, undefined, new FormData());

    expect(result).toMatchObject({ message: "You are not allowed to do that." });
    expect(result?.success).toBeUndefined();
    expect(await statusOf(org.id)).toBe(startsAs);
  });

  it("asks a signed-out visitor to sign in", async () => {
    const org = await createOrganization({ status: startsAs });

    const result = await actions[name](org.id, undefined, new FormData());

    expect(result).toMatchObject({ message: "Please sign in to continue." });
    expect(await statusOf(org.id)).toBe(startsAs);
  });
});

describe("an admin making a change that is not allowed", () => {
  it("gets a readable message and nothing changes", async () => {
    const org = await createOrganization({ status: ACTIVE });
    await signInAs(UserRole.ADMIN);

    const result = await actions.rejectOrganizationAction(org.id, undefined, new FormData());

    expect(result?.success).toBeUndefined();
    expect(result?.message).toMatch(/active/);
    expect(await statusOf(org.id)).toBe(ACTIVE);
  });
});