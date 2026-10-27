import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { OpportunityStatus } from "@/features/opportunities/constants";
import { Opportunity } from "@/models/Opportunity";
import { Organization, OrganizationStatus } from "@/models/Organization";
import { OrganizationMembership } from "@/models/OrganizationMembership";
import { User, UserRole } from "@/models/User";
import { clearTestDb, startTestDb, stopTestDb } from "../helpers/db";
import {
  createMembership,
  createOpportunityFixture,
  createOrganization,
  createUser,
} from "../helpers/factories";

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe("Organization", () => {
  it("creates with pending status and timestamps by default", async () => {
    const org = await Organization.create({
      name: "Tech Society",
      slug: "tech-society",
      contactEmail: "hello@test.dev",
    });

    expect(org.status).toBe(OrganizationStatus.PENDING);
    expect(org.createdAt).toBeInstanceOf(Date);
    expect(org.updatedAt).toBeInstanceOf(Date);
  });

  it("requires name, slug and contact email", async () => {
    await expect(new Organization({}).validate()).rejects.toThrow();
  });

  it("rejects an unknown status", async () => {
    await expect(
      new Organization({ name: "X", slug: "x", contactEmail: "x@test.dev", status: "banned" }).validate(),
    ).rejects.toThrow();
  });

  it("normalizes slugs to lowercase", async () => {
    const org = await createOrganization({ slug: "  Mixed-Case  " });
    expect(org.slug).toBe("mixed-case");
  });

  it("rejects duplicate slugs", async () => {
    await createOrganization({ slug: "same-slug" });
    await expect(createOrganization({ slug: "same-slug" })).rejects.toMatchObject({ code: 11000 });
  });
});

describe("Opportunity", () => {
  it("creates as a draft with no links by default", async () => {
    const org = await createOrganization();
    const opportunity = await Opportunity.create({
      title: "Hackathon",
      slug: "hackathon",
      summary: "A summary",
      description: "A description",
      organizationId: org._id,
      category: "competition",
      type: "in_person",
      applicationUrl: "https://example.com/apply",
    });

    expect(opportunity.status).toBe(OpportunityStatus.DRAFT);
    expect(opportunity.additionalLinks).toEqual([]);
    expect(opportunity.publishedAt).toBeUndefined();
  });

  it("rejects duplicate slugs", async () => {
    const org = await createOrganization();
    await createOpportunityFixture(org._id, { slug: "same-slug" });
    await expect(createOpportunityFixture(org._id, { slug: "same-slug" })).rejects.toMatchObject({
      code: 11000,
    });
  });

  it("rejects an unknown category", async () => {
    const org = await createOrganization();
    await expect(
      createOpportunityFixture(org._id, { category: "banana" as never }),
    ).rejects.toThrow();
  });

  it("accepts the club category", async () => {
    const org = await createOrganization();
    const club = await createOpportunityFixture(org._id, { category: "club" });
    expect(club.category).toBe("club");
  });

  it("persists status transitions draft -> published -> archived", async () => {
    const org = await createOrganization();
    const opportunity = await createOpportunityFixture(org._id, {
      status: OpportunityStatus.DRAFT,
      publishedAt: undefined,
    });

    opportunity.status = OpportunityStatus.PUBLISHED;
    opportunity.publishedAt = new Date();
    await opportunity.save();
    expect((await Opportunity.findById(opportunity._id))?.status).toBe(OpportunityStatus.PUBLISHED);

    opportunity.status = OpportunityStatus.ARCHIVED;
    await opportunity.save();
    const reloaded = await Opportunity.findById(opportunity._id);
    expect(reloaded?.status).toBe(OpportunityStatus.ARCHIVED);
    expect(reloaded?.publishedAt).toBeInstanceOf(Date); // history is kept
  });

  it("has the unique slug index and the listing index", async () => {
    const indexes = await Opportunity.collection.indexes();
    expect(indexes.some((i) => i.key.slug === 1 && i.unique)).toBe(true);
    expect(indexes.some((i) => i.key.status === 1 && i.key.publishedAt === -1)).toBe(true);
  });
});

describe("User", () => {
  it("can exist without any organization", async () => {
    await expect(
      new User({ name: "A", email: "a@test.dev", role: UserRole.ORG_MEMBER }).validate(),
    ).resolves.toBeUndefined();
  });

  it("does not require an organization for admins", async () => {
    await expect(
      new User({ name: "A", email: "a@test.dev", role: UserRole.ADMIN }).validate(),
    ).resolves.toBeUndefined();
  });

  it("rejects duplicate emails", async () => {
    await createUser({ email: "dup@test.dev" });
    await expect(createUser({ email: "dup@test.dev" })).rejects.toMatchObject({ code: 11000 });
  });

  it("rejects two users linked to the same Better Auth account", async () => {
    await createUser({ authProviderId: "auth-user-1" });
    await expect(createUser({ authProviderId: "auth-user-1" })).rejects.toMatchObject({
      code: 11000,
    });
  });

  it("allows many users that have no Better Auth link", async () => {
    await createUser();
    await createUser();
    expect(await User.countDocuments({ authProviderId: { $exists: false } })).toBe(2);
  });

  it("has a unique, sparse index on authProviderId", async () => {
    const indexes = await User.collection.indexes();
    expect(
      indexes.some((i) => i.key.authProviderId === 1 && i.unique && i.sparse),
    ).toBe(true);
  });

  it("keeps passwordHash out of normal queries", async () => {
    await createUser({ email: "p@test.dev", passwordHash: "secret" });
    const user = await User.findOne({ email: "p@test.dev" });
    expect(user?.passwordHash).toBeUndefined();
  });
});

describe("OrganizationMembership", () => {
  it("links a user to an organization", async () => {
    const org = await createOrganization();
    const user = await createUser();

    const membership = await createMembership(user._id, org._id);

    expect(membership.userId.toString()).toBe(user.id);
    expect(membership.organizationId.toString()).toBe(org.id);
    expect(membership.createdAt).toBeInstanceOf(Date);
  });

  it("lets one user belong to several organizations", async () => {
    const [a, b] = [await createOrganization(), await createOrganization()];
    const user = await createUser();
    await createMembership(user._id, a._id);
    await createMembership(user._id, b._id);

    expect(await OrganizationMembership.countDocuments({ userId: user._id })).toBe(2);
  });

  it("lets one organization have several users", async () => {
    const org = await createOrganization();
    await createMembership((await createUser())._id, org._id);
    await createMembership((await createUser())._id, org._id);

    expect(await OrganizationMembership.countDocuments({ organizationId: org._id })).toBe(2);
  });

  it("rejects a duplicate membership", async () => {
    const org = await createOrganization();
    const user = await createUser();
    await createMembership(user._id, org._id);

    await expect(createMembership(user._id, org._id)).rejects.toMatchObject({ code: 11000 });
    expect(await OrganizationMembership.countDocuments({})).toBe(1);
  });

  it("requires both a user and an organization", async () => {
    await expect(new OrganizationMembership({}).validate()).rejects.toThrow();
  });

  it("has a unique index on user and organization", async () => {
    const indexes = await OrganizationMembership.collection.indexes();
    expect(
      indexes.some((i) => i.key.userId === 1 && i.key.organizationId === 1 && i.unique),
    ).toBe(true);
  });
});