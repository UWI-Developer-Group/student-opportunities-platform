import mongoose from "mongoose";
import { ZodError } from "zod";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createOpportunity } from "@/features/opportunities/commands";
import { addOrganizationMember } from "@/features/organizations/memberships";
import { createPendingOrganization } from "@/features/organizations/service";
import { Organization, OrganizationStatus } from "@/models/Organization";
import { OrganizationMembership } from "@/models/OrganizationMembership";
import { User, UserRole } from "@/models/User";
import { clearTestDb, startTestReplicaSetDb, stopTestDb } from "../helpers/db";
import { actorFor, createUser } from "../helpers/factories";

// No real HTTP request in tests, so next/headers is faked.
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ set: () => undefined, get: () => undefined }),
}));

// Keep the real behaviour, but let individual tests make these fail once.
vi.mock("@/features/organizations/memberships", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/organizations/memberships")>();
  return { ...actual, addOrganizationMember: vi.fn(actual.addOrganizationMember) };
});
vi.mock("@/features/organizations/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/organizations/service")>();
  return { ...actual, createPendingOrganization: vi.fn(actual.createPendingOrganization) };
});

const PASSWORD = "a-long-test-password";

const details = {
  organizationName: "UWI Developer Group",
  description: "A student developer community on campus.",
  websiteUrl: "https://uwi.example.com",
};

const registration = { name: "Ana Lee", email: "ana@test.dev", password: PASSWORD, ...details };

// lib/auth.ts reads MONGODB_URI when it loads, so it is imported after the test database starts.
let auth: typeof import("@/lib/auth").auth;
let registerOrganization: typeof import("@/features/organizations/registration").registerOrganization;

beforeAll(async () => {
  await startTestReplicaSetDb();
  ({ auth } = await import("@/lib/auth"));
  ({ registerOrganization } = await import("@/features/organizations/registration"));
});
afterAll(stopTestDb);

beforeEach(async () => {
  await clearTestDb();
  const db = mongoose.connection.db!;
  await Promise.all(
    ["user", "session", "account", "verification"].map((name) => db.collection(name).deleteMany({})),
  );
});

const betterAuthUsers = () => mongoose.connection.db!.collection("user").countDocuments({});

describe("createPendingOrganization", () => {
  it("creates a pending organization and makes the user its member", async () => {
    const user = await createUser();

    const created = await createPendingOrganization(user.id, details);

    expect(created).toMatchObject({ slug: "uwi-developer-group", status: OrganizationStatus.PENDING });
    const stored = await Organization.findById(created.id);
    expect(stored).toMatchObject({
      name: "UWI Developer Group",
      status: OrganizationStatus.PENDING,
      contactEmail: user.email, // defaults to the user's email
    });
    expect(stored?.verifiedAt).toBeUndefined();
    expect(await OrganizationMembership.countDocuments({ userId: user._id, organizationId: stored!._id })).toBe(1);
  });

  it("uses the contact email when one is given", async () => {
    const user = await createUser();
    const created = await createPendingOrganization(user.id, { ...details, contactEmail: "Contact@Test.dev" });

    expect((await Organization.findById(created.id))?.contactEmail).toBe("contact@test.dev");
  });

  it("ignores status, slug and verification smuggled into the input", async () => {
    const user = await createUser();

    const created = await createPendingOrganization(user.id, {
      ...details,
      status: "active",
      slug: "chosen-by-me",
      verifiedAt: new Date(),
      verifiedBy: user.id,
    });

    const stored = await Organization.findById(created.id);
    expect(stored?.status).toBe(OrganizationStatus.PENDING);
    expect(stored?.slug).toBe("uwi-developer-group");
    expect(stored?.verifiedAt).toBeUndefined();
    expect(stored?.verifiedBy).toBeUndefined();
  });

  it("lets one person register several organizations", async () => {
    const user = await createUser();

    await createPendingOrganization(user.id, details);
    await createPendingOrganization(user.id, { ...details, organizationName: "Computer Science Club" });

    expect(await OrganizationMembership.countDocuments({ userId: user._id })).toBe(2);
    expect(await Organization.countDocuments({ status: OrganizationStatus.PENDING })).toBe(2);
  });

  it("gives two organizations with the same name different slugs", async () => {
    const [a, b] = [await createUser(), await createUser()];

    const first = await createPendingOrganization(a.id, details);
    const second = await createPendingOrganization(b.id, details);

    expect(second.slug).not.toBe(first.slug);
    expect(second.slug.startsWith("uwi-developer-group-")).toBe(true);
  });

  it("is forbidden for admins and reports unknown users", async () => {
    const admin = await createUser({ role: UserRole.ADMIN });

    await expect(createPendingOrganization(admin.id, details)).rejects.toMatchObject({ code: "forbidden" });
    await expect(createPendingOrganization("64b7f0f2f0f0f0f0f0f0f0f0", details)).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(createPendingOrganization("not-an-id", details)).rejects.toMatchObject({ code: "not_found" });
    expect(await Organization.countDocuments({})).toBe(0);
  });

  it("rejects invalid input", async () => {
    const user = await createUser();
    await expect(
      createPendingOrganization(user.id, { ...details, description: "too short" }),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      createPendingOrganization(user.id, { ...details, websiteUrl: "javascript:alert(1)" }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("does not leave an organization behind if adding the member fails", async () => {
    const user = await createUser();
    vi.mocked(addOrganizationMember).mockRejectedValueOnce(new Error("boom"));

    await expect(createPendingOrganization(user.id, details)).rejects.toThrow("boom");
    expect(await Organization.countDocuments({})).toBe(0);
  });
});

describe("registerOrganization", () => {
  it("creates the account, a pending organization, and the membership", async () => {
    const { userId, organization } = await registerOrganization(registration);

    const user = await User.findById(userId);
    expect(user).toMatchObject({ email: "ana@test.dev", role: UserRole.ORG_MEMBER });
    expect(user?.authProviderId).toBeTruthy();
    expect(organization.status).toBe(OrganizationStatus.PENDING);
    expect(await OrganizationMembership.countDocuments({ userId: user!._id })).toBe(1);
  });

  it("creates a real login that works with the chosen password", async () => {
    await registerOrganization(registration);

    await expect(
      auth.api.signInEmail({ body: { email: "ana@test.dev", password: PASSWORD } }),
    ).resolves.toBeDefined();
  });

  it("cannot be used to become an admin or to activate the organization", async () => {
    const { userId, organization } = await registerOrganization({
      ...registration,
      role: "admin",
      status: "active",
    });

    expect((await User.findById(userId))?.role).toBe(UserRole.ORG_MEMBER);
    expect(organization.status).toBe(OrganizationStatus.PENDING);
  });

  it("leaves the organization unable to publish until an admin approves it", async () => {
    const { userId, organization } = await registerOrganization(registration);
    const actor = await actorFor({ id: userId, role: UserRole.ORG_MEMBER });

    await expect(
      createOpportunity(actor, organization.id, {
        title: "Robotics Club Open Day",
        summary: "Come and meet the robotics club.",
        description: "A description that is comfortably longer than thirty characters.",
        category: "club",
        type: "in_person",
        applicationUrl: "https://example.com/apply",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects an email that already has an account, creating nothing", async () => {
    await createUser({ email: "ana@test.dev" });

    await expect(registerOrganization(registration)).rejects.toMatchObject({ code: "email_taken" });
    expect(await Organization.countDocuments({})).toBe(0);
    expect(await betterAuthUsers()).toBe(0);
  });

  it("maps Better Auth's own duplicate-email error to email_taken", async () => {
    await auth.api.signUpEmail({ body: { name: "Old", email: "ana@test.dev", password: PASSWORD } });
    await User.deleteMany({}); // our record is gone, but Better Auth still has the account

    await expect(registerOrganization(registration)).rejects.toMatchObject({ code: "email_taken" });
    expect(await Organization.countDocuments({})).toBe(0);
  });

  it("rejects invalid input before creating anything", async () => {
    await expect(registerOrganization({ ...registration, password: "short" })).rejects.toBeInstanceOf(ZodError);

    expect(await betterAuthUsers()).toBe(0);
    expect(await User.countDocuments({})).toBe(0);
    expect(await Organization.countDocuments({})).toBe(0);
  });

  it("keeps the account when the organization step fails, and lets them finish later", async () => {
    vi.mocked(createPendingOrganization).mockRejectedValueOnce(new Error("db down"));

    await expect(registerOrganization(registration)).rejects.toMatchObject({
      code: "organization_creation_failed",
    });
    expect(await Organization.countDocuments({})).toBe(0);
    expect(await betterAuthUsers()).toBe(1);

    // Signed in as that account, they register the organization through the second flow.
    const user = await User.findOne({ email: "ana@test.dev" });
    const created = await createPendingOrganization(user!.id, details);
    expect(created.status).toBe(OrganizationStatus.PENDING);
    expect(await OrganizationMembership.countDocuments({ userId: user!._id })).toBe(1);
  });
});