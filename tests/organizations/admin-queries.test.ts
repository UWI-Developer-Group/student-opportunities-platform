import mongoose from "mongoose";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
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

// lib/auth.ts reads MONGODB_URI when it loads, so everything that uses it is imported after the database starts.
let auth: typeof import("@/lib/auth").auth;
let listPendingOrganizations: typeof import("@/features/organizations/adminQueries").listPendingOrganizations;

beforeAll(async () => {
  await startTestReplicaSetDb();
  ({ auth } = await import("@/lib/auth"));
  ({ listPendingOrganizations } =
    await import("@/features/organizations/adminQueries"));
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
  state.headers = new Headers();
});

// Signs up a person with the given role and signs them in.
async function signInAs(role: UserRole) {
  const { headers, response } = await auth.api.signUpEmail({
    body: { name: "Test Person", email: "person@test.dev", password: PASSWORD },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const user = (await User.findOne({ authProviderId: response.user.id }))!;
  await User.updateOne({ _id: user._id }, { $set: { role } });
  state.headers = new Headers({ cookie });
  return user;
}

// Bypasses Mongoose, which treats createdAt as immutable, so ordering never depends on insert timing.
const setCreatedAt = (id: string, createdAt: Date) =>
  Organization.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(id) },
    { $set: { createdAt } },
  );

describe("listPendingOrganizations", () => {
  it("returns only pending organizations, oldest registration first", async () => {
    await signInAs(UserRole.ADMIN);
    const newest = await createOrganization({
      status: PENDING,
      name: "Newest",
    });
    const oldest = await createOrganization({
      status: PENDING,
      name: "Oldest",
    });
    const middle = await createOrganization({
      status: PENDING,
      name: "Middle",
    });
    await createOrganization({ status: ACTIVE });
    await createOrganization({ status: REJECTED });
    await createOrganization({ status: SUSPENDED });
    await setCreatedAt(oldest.id, new Date("2026-01-01"));
    await setCreatedAt(middle.id, new Date("2026-02-01"));
    await setCreatedAt(newest.id, new Date("2026-03-01"));

    const result = await listPendingOrganizations();

    expect(result.map((org) => org.name)).toEqual([
      "Oldest",
      "Middle",
      "Newest",
    ]);
  });

  it("returns what an admin needs to review a registration", async () => {
    await signInAs(UserRole.ADMIN);
    const org = await createOrganization({
      status: PENDING,
      name: "Chess Society",
      description: "We play chess every week.",
      contactEmail: "chess@test.dev",
      websiteUrl: "https://chess.example.com",
      logoUrl: "https://chess.example.com/logo.png",
    });

    const [found] = await listPendingOrganizations();

    expect(found).toMatchObject({
      id: org.id,
      name: "Chess Society",
      slug: org.slug,
      description: "We play chess every week.",
      contactEmail: "chess@test.dev",
      websiteUrl: "https://chess.example.com",
      logoUrl: "https://chess.example.com/logo.png",
    });
    expect(found.createdAt).toBeInstanceOf(Date);
    expect(found).not.toHaveProperty("status");
    expect(found).not.toHaveProperty("verifiedBy");
  });

  it("returns an empty list when nothing is pending", async () => {
    await signInAs(UserRole.ADMIN);
    await createOrganization({ status: ACTIVE });

    expect(await listPendingOrganizations()).toEqual([]);
  });

  it("does not modify any organization", async () => {
    await signInAs(UserRole.ADMIN);
    await createOrganization({ status: PENDING });
    const before = await Organization.find({}).lean();

    await listPendingOrganizations();

    expect(await Organization.find({}).lean()).toEqual(before);
  });

  it("refuses a member, even of a pending organization", async () => {
    const org = await createOrganization({ status: PENDING });
    const user = await signInAs(UserRole.ORG_MEMBER);
    await OrganizationMembership.create({
      userId: user._id,
      organizationId: org._id,
    });

    await expect(listPendingOrganizations()).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("refuses a signed-out visitor", async () => {
    await createOrganization({ status: PENDING });

    await expect(listPendingOrganizations()).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });
});
