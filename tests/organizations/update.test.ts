import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { updateOrganization } from "@/features/organizations/service";
import { Organization, OrganizationStatus } from "@/models/Organization";
import { User, UserRole } from "@/models/User";
import { clearTestDb, startTestReplicaSetDb, stopTestDb } from "../helpers/db";
import { createMemberOf, createOrganization, createUser } from "../helpers/factories";

beforeAll(startTestReplicaSetDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

const LONG_DESCRIPTION = "A description that is comfortably longer than twenty characters.";

describe("updateOrganization", () => {
  it("lets a member update the name, description, website and logo", async () => {
    const org = await createOrganization();
    const member = await createMemberOf(org);

    await updateOrganization(member.id, org.id, {
      name: "New Name",
      description: LONG_DESCRIPTION,
      websiteUrl: "https://new.example.com",
      logoUrl: "https://new.example.com/logo.png",
    });

    expect(await Organization.findById(org.id)).toMatchObject({
      name: "New Name",
      description: LONG_DESCRIPTION,
      websiteUrl: "https://new.example.com",
      logoUrl: "https://new.example.com/logo.png",
    });
  });

  it("leaves fields that were not sent unchanged", async () => {
    const org = await createOrganization({
      description: LONG_DESCRIPTION,
      websiteUrl: "https://keep.example.com",
    });
    const member = await createMemberOf(org);

    await updateOrganization(member.id, org.id, { name: "Only The Name" });

    expect(await Organization.findById(org.id)).toMatchObject({
      name: "Only The Name",
      description: LONG_DESCRIPTION,
      websiteUrl: "https://keep.example.com",
    });
  });

  it("removes the website and logo when they are sent blank", async () => {
    const org = await createOrganization({
      websiteUrl: "https://old.example.com",
      logoUrl: "https://old.example.com/logo.png",
    });
    const member = await createMemberOf(org);

    await updateOrganization(member.id, org.id, { websiteUrl: "", logoUrl: "  " });

    const stored = await Organization.findById(org.id);
    expect(stored?.websiteUrl).toBeUndefined();
    expect(stored?.logoUrl).toBeUndefined();
  });

  it("gives every member of an organization the same ability to edit it", async () => {
    const org = await createOrganization();
    const first = await createMemberOf(org);
    const second = await createMemberOf(org);

    await updateOrganization(first.id, org.id, { name: "By First" });
    await updateOrganization(second.id, org.id, { name: "By Second" });

    expect((await Organization.findById(org.id))?.name).toBe("By Second");
  });

  it("lets a member of a pending organization edit it, and keeps it pending", async () => {
    const org = await createOrganization({ status: OrganizationStatus.PENDING });
    const member = await createMemberOf(org);

    const result = await updateOrganization(member.id, org.id, { name: "Better Name" });

    expect(result).toMatchObject({ id: org.id, status: OrganizationStatus.PENDING });
  });

  it("keeps the slug when the name changes", async () => {
    const org = await createOrganization({ slug: "stable-slug" });
    const member = await createMemberOf(org);

    const result = await updateOrganization(member.id, org.id, { name: "Totally Different" });

    expect(result.slug).toBe("stable-slug");
    expect((await Organization.findById(org.id))?.slug).toBe("stable-slug");
  });

  it("supports a user who belongs to several organizations, but only those", async () => {
    const [a, b, c] = [await createOrganization(), await createOrganization(), await createOrganization()];
    const member = await createMemberOf(a, b);

    await updateOrganization(member.id, a.id, { name: "A Renamed" });
    await updateOrganization(member.id, b.id, { name: "B Renamed" });
    await expect(updateOrganization(member.id, c.id, { name: "C Renamed" })).rejects.toMatchObject({
      code: "forbidden",
    });

    expect((await Organization.findById(c.id))?.name).toBe(c.name);
  });

  it("does not let a member of organization A modify organization B", async () => {
    const [a, b] = [await createOrganization(), await createOrganization()];
    const member = await createMemberOf(a);

    await expect(updateOrganization(member.id, b.id, { name: "Hijacked" })).rejects.toMatchObject({
      code: "forbidden",
    });

    expect((await Organization.findById(b.id))?.name).toBe(b.name);
  });

  it("forbids users with no membership, including admins", async () => {
    const org = await createOrganization();
    const outsider = await createUser();
    const admin = await createUser({ role: UserRole.ADMIN });

    for (const user of [outsider, admin]) {
      await expect(updateOrganization(user.id, org.id, { name: "Nope" })).rejects.toMatchObject({
        code: "forbidden",
      });
    }
    expect((await Organization.findById(org.id))?.name).toBe(org.name);
  });

    it("forbids an admin even when a membership row exists", async () => {
    const org = await createOrganization();
    const admin = await createMemberOf(org);
    await User.updateOne({ _id: admin._id }, { role: UserRole.ADMIN });

    await expect(updateOrganization(admin.id, org.id, { name: "Nope" })).rejects.toMatchObject({
      code: "forbidden",
    });
    expect((await Organization.findById(org.id))?.name).toBe(org.name);
  });

  it("gives the same answer for an unknown organization and malformed ids", async () => {
    const member = await createMemberOf(await createOrganization());

    for (const [userId, organizationId] of [
      [member.id, "64b7f0f2f0f0f0f0f0f0f0f0"],
      [member.id, "not-an-id"],
      ["not-an-id", "64b7f0f2f0f0f0f0f0f0f0f0"],
    ]) {
      await expect(updateOrganization(userId, organizationId, { name: "Nope" })).rejects.toMatchObject({
        code: "forbidden",
      });
    }
  });

  it("ignores status, slug, contact email and verification in the input", async () => {
    const org = await createOrganization({
      status: OrganizationStatus.PENDING,
      slug: "original-slug",
      contactEmail: "original@test.dev",
    });
    const member = await createMemberOf(org);

    await updateOrganization(member.id, org.id, {
      name: "Renamed",
      status: "active",
      slug: "chosen-by-me",
      contactEmail: "attacker@test.dev",
      verifiedAt: new Date(),
      verifiedBy: member.id,
    });

    const stored = await Organization.findById(org.id);
    expect(stored).toMatchObject({
      name: "Renamed",
      status: OrganizationStatus.PENDING,
      slug: "original-slug",
      contactEmail: "original@test.dev",
    });
    expect(stored?.verifiedAt).toBeUndefined();
    expect(stored?.verifiedBy).toBeUndefined();
  });

  it.each([
    ["a name that is too short", { name: "A" }],
    ["a description that is too short", { description: "too short" }],
    ["a website that is not http(s)", { websiteUrl: "javascript:alert(1)" }],
    ["a logo that is not a URL", { logoUrl: "not a url" }],
    ["an ftp logo link", { logoUrl: "ftp://example.com/logo.png" }],
    ["no fields at all", {}],
    ["only fields that cannot be edited", { status: "active" }],
  ])("rejects %s and changes nothing", async (_label, input) => {
    const org = await createOrganization();
    const member = await createMemberOf(org);

    await expect(updateOrganization(member.id, org.id, input)).rejects.toBeInstanceOf(ZodError);

    expect((await Organization.findById(org.id))?.name).toBe(org.name);
  });
});