import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getOrganization, getOrganizationBySlug } from "@/features/organizations/queries";
import { OrganizationStatus } from "@/models/Organization";
import { clearTestDb, startTestReplicaSetDb, stopTestDb } from "../helpers/db";
import { createOrganization } from "../helpers/factories";

beforeAll(startTestReplicaSetDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

const HIDDEN_STATUSES = [
  OrganizationStatus.PENDING,
  OrganizationStatus.REJECTED,
  OrganizationStatus.SUSPENDED,
] as const;

describe("getOrganization", () => {
  it("returns an active organization by id", async () => {
    const org = await createOrganization({ name: "Robotics Club", description: "We build robots." });

    const found = await getOrganization(org.id);

    expect(found).toMatchObject({
      id: org.id,
      name: "Robotics Club",
      slug: org.slug,
      description: "We build robots.",
    });
  });

  it("does not expose internal fields", async () => {
    const org = await createOrganization();

    const found = await getOrganization(org.id);

    expect(found).not.toHaveProperty("status");
    expect(found).not.toHaveProperty("contactEmail");
    expect(found).not.toHaveProperty("verifiedBy");
    expect(found).not.toHaveProperty("verifiedAt");
  });

  it("returns null for an organization that does not exist", async () => {
    expect(await getOrganization("64b7f0f2f0f0f0f0f0f0f0f0")).toBeNull();
  });

  it("returns null for a malformed id instead of throwing", async () => {
    expect(await getOrganization("not-an-id")).toBeNull();
  });

  it.each(HIDDEN_STATUSES)("returns null for a %s organization", async (status) => {
    const org = await createOrganization({ status });

    expect(await getOrganization(org.id)).toBeNull();
  });
});

describe("getOrganizationBySlug", () => {
  it("returns an active organization by slug", async () => {
    const org = await createOrganization({ name: "Chess Society", slug: "chess-society" });

    const found = await getOrganizationBySlug("chess-society");

    expect(found).toMatchObject({ id: org.id, name: "Chess Society", slug: "chess-society" });
  });

  it("matches regardless of case and surrounding whitespace", async () => {
    const org = await createOrganization({ slug: "chess-society" });

    expect((await getOrganizationBySlug("  Chess-Society "))?.id).toBe(org.id);
  });

  it("returns null for a slug that does not exist", async () => {
    await createOrganization({ slug: "chess-society" });

    expect(await getOrganizationBySlug("no-such-org")).toBeNull();
  });

  it("returns null for an empty slug", async () => {
    expect(await getOrganizationBySlug("   ")).toBeNull();
  });

  it.each(HIDDEN_STATUSES)("returns null for a %s organization", async (status) => {
    await createOrganization({ slug: "hidden-org", status });

    expect(await getOrganizationBySlug("hidden-org")).toBeNull();
  });

  it("only returns the active organization when others share nothing but a name", async () => {
    await createOrganization({ name: "Same Name", slug: "same-name-pending", status: OrganizationStatus.PENDING });
    const active = await createOrganization({ name: "Same Name", slug: "same-name" });

    expect((await getOrganizationBySlug("same-name"))?.id).toBe(active.id);
    expect(await getOrganizationBySlug("same-name-pending")).toBeNull();
  });
});