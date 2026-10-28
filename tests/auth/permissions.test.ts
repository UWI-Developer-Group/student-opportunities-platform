import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentUser,
  requireAdmin,
  requireOrganizationMember,
  requireUser,
} from "@/features/auth/permissions";
import { getSessionUserId } from "@/features/auth/session";
import { createOpportunity } from "@/features/opportunities/commands";
import { UserRole } from "@/models/User";
import { clearTestDb, startTestDb, stopTestDb } from "../helpers/db";
import { createMemberOf, createOrganization, createUser } from "../helpers/factories";

// Stand-in for the real auth provider: tests choose who is "signed in".
vi.mock("@/features/auth/session", () => ({ getSessionUserId: vi.fn() }));
const signInAs = (userId: string | null) =>
  vi.mocked(getSessionUserId).mockResolvedValue(userId);

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  signInAs(null);
});

async function memberOfOne() {
  const organization = await createOrganization();
  const user = await createMemberOf(organization);
  return { user, organization };
}

describe("getCurrentUser", () => {
  it("returns null when nobody is signed in", async () => {
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns null for an unknown or malformed session id", async () => {
    signInAs("not-an-id");
    expect(await getCurrentUser()).toBeNull();
    signInAs("64b7f0f2f0f0f0f0f0f0f0f0");
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns plain data with string ids and no password hash", async () => {
    const { user, organization } = await memberOfOne();
    signInAs(user.id);

    const current = await getCurrentUser();
    expect(current).toMatchObject({
      id: user.id,
      role: UserRole.ORG_MEMBER,
      organizationIds: [organization.id],
    });
    expect(current).not.toHaveProperty("passwordHash");
  });

  it("includes every organization the user belongs to", async () => {
    const [a, b] = [await createOrganization(), await createOrganization()];
    const user = await createMemberOf(a, b);
    signInAs(user.id);

    expect((await getCurrentUser())?.organizationIds.sort()).toEqual([a.id, b.id].sort());
  });

  it("works for a signed-in user with no organizations", async () => {
    const user = await createUser();
    signInAs(user.id);

    expect(await getCurrentUser()).toMatchObject({ id: user.id, organizationIds: [] });
  });
});

describe("requireUser", () => {
  it("throws unauthenticated when signed out", async () => {
    await expect(requireUser()).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("returns the user when signed in, even without organizations", async () => {
    const user = await createUser();
    signInAs(user.id);
    await expect(requireUser()).resolves.toMatchObject({ id: user.id });
  });
});

describe("requireOrganizationMember", () => {
  it("allows a member of that organization", async () => {
    const { user, organization } = await memberOfOne();
    signInAs(user.id);
    await expect(requireOrganizationMember(organization.id)).resolves.toMatchObject({ id: user.id });
  });

  it("allows a member of several organizations in each of them", async () => {
    const [a, b] = [await createOrganization(), await createOrganization()];
    signInAs((await createMemberOf(a, b)).id);

    await expect(requireOrganizationMember(a.id)).resolves.toBeDefined();
    await expect(requireOrganizationMember(b.id)).resolves.toBeDefined();
  });

  it("forbids a non-member, even one who belongs to other organizations", async () => {
    const { user } = await memberOfOne();
    const stranger = await createOrganization();
    signInAs(user.id);

    await expect(requireOrganizationMember(stranger.id)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("forbids a signed-in user with no memberships", async () => {
    const organization = await createOrganization();
    signInAs((await createUser()).id);

    await expect(requireOrganizationMember(organization.id)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("forbids an unknown or malformed organization id", async () => {
    const { user } = await memberOfOne();
    signInAs(user.id);

    await expect(requireOrganizationMember("not-an-id")).rejects.toMatchObject({ code: "forbidden" });
    await expect(requireOrganizationMember("64b7f0f2f0f0f0f0f0f0f0f0")).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("forbids admins and rejects signed-out visitors", async () => {
    const organization = await createOrganization();
    signInAs((await createUser({ role: UserRole.ADMIN })).id);
    await expect(requireOrganizationMember(organization.id)).rejects.toMatchObject({ code: "forbidden" });

    signInAs(null);
    await expect(requireOrganizationMember(organization.id)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("works directly as the actor for opportunity commands", async () => {
    const { user, organization } = await memberOfOne();
    signInAs(user.id);

    const created = await createOpportunity(
      await requireOrganizationMember(organization.id),
      organization.id,
      {
        title: "Robotics Club Open Day",
        summary: "Come and meet the robotics club.",
        description: "A description that is comfortably longer than thirty characters.",
        category: "club",
        type: "in_person",
        applicationUrl: "https://example.com/apply",
      },
    );
    expect(created.status).toBe("draft");
  });
});

describe("requireAdmin", () => {
  it("allows admins", async () => {
    const admin = await createUser({ role: UserRole.ADMIN });
    signInAs(admin.id);
    await expect(requireAdmin()).resolves.toMatchObject({ id: admin.id });
  });

  it("forbids organization members (non-admin cannot reach admin actions)", async () => {
    signInAs((await memberOfOne()).user.id);
    await expect(requireAdmin()).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects signed-out visitors", async () => {
    await expect(requireAdmin()).rejects.toMatchObject({ code: "unauthenticated" });
  });
});