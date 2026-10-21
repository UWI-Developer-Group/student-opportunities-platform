import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { OpportunityStatus } from "@/features/opportunities/constants";
import { getPublicOpportunity, listPublicOpportunities } from "@/features/opportunities/service";
import { OrganizationStatus } from "@/models/Organization";
import { clearTestDb, startTestDb, stopTestDb } from "../helpers/db";
import { createOpportunityFixture, createOrganization, daysFromNow } from "../helpers/factories";

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

const titlesOf = (result: { items: { title: string }[] }) =>
  result.items.map((item) => item.title).sort();

describe("public visibility", () => {
  it("shows published opportunities from active organizations", async () => {
    const org = await createOrganization();
    await createOpportunityFixture(org._id, { title: "Visible" });

    expect(titlesOf(await listPublicOpportunities())).toEqual(["Visible"]);
  });

  it("hides drafts", async () => {
    const org = await createOrganization();
    await createOpportunityFixture(org._id, { status: OpportunityStatus.DRAFT });

    expect((await listPublicOpportunities()).total).toBe(0);
  });

  it("hides archived opportunities", async () => {
    const org = await createOrganization();
    await createOpportunityFixture(org._id, { status: OpportunityStatus.ARCHIVED });

    expect((await listPublicOpportunities()).total).toBe(0);
  });

  it.each([OrganizationStatus.SUSPENDED, OrganizationStatus.PENDING, OrganizationStatus.REJECTED])(
    "hides published opportunities when the organization is %s",
    async (status) => {
      const org = await createOrganization({ status });
      await createOpportunityFixture(org._id, { slug: "hidden-one" });

      expect((await listPublicOpportunities()).total).toBe(0);
      expect(await getPublicOpportunity("hidden-one")).toBeNull();
    },
  );

  it("hides listings again when an organization is suspended later", async () => {
    const org = await createOrganization();
    await createOpportunityFixture(org._id, { slug: "was-visible" });
    expect(await getPublicOpportunity("was-visible")).not.toBeNull();

    org.status = OrganizationStatus.SUSPENDED;
    await org.save();
    expect(await getPublicOpportunity("was-visible")).toBeNull();
  });
});

describe("detail lookup", () => {
  it("returns the opportunity with its organization", async () => {
    const org = await createOrganization({ name: "Robotics Club", slug: "robotics" });
    await createOpportunityFixture(org._id, { slug: "open-day", location: "Main Campus" });

    const found = await getPublicOpportunity("open-day");
    expect(found?.organization).toMatchObject({ name: "Robotics Club", slug: "robotics" });
    expect(found?.location).toBe("Main Campus");
  });

  it("matches slugs case-insensitively and returns null when missing", async () => {
    const org = await createOrganization();
    await createOpportunityFixture(org._id, { slug: "open-day" });

    expect(await getPublicOpportunity("OPEN-Day")).not.toBeNull();
    expect(await getPublicOpportunity("does-not-exist")).toBeNull();
  });

  it("returns ids as plain strings", async () => {
    const org = await createOrganization();
    await createOpportunityFixture(org._id, { slug: "plain-ids" });

    const found = await getPublicOpportunity("plain-ids");
    expect(typeof found?.id).toBe("string");
    expect(typeof found?.organization.id).toBe("string");
  });
});

describe("filtering and search", () => {
  it("filters by category and type", async () => {
    const org = await createOrganization();
    await createOpportunityFixture(org._id, { title: "A", category: "club", type: "in_person" });
    await createOpportunityFixture(org._id, { title: "B", category: "club", type: "online" });
    await createOpportunityFixture(org._id, { title: "C", category: "scholarship", type: "online" });

    expect(titlesOf(await listPublicOpportunities({ category: "club" }))).toEqual(["A", "B"]);
    expect(titlesOf(await listPublicOpportunities({ category: "club", type: "online" }))).toEqual(["B"]);
  });

  it("filters by organization slug", async () => {
    const one = await createOrganization({ slug: "one" });
    const two = await createOrganization({ slug: "two" });
    await createOpportunityFixture(one._id, { title: "From one" });
    await createOpportunityFixture(two._id, { title: "From two" });

    expect(titlesOf(await listPublicOpportunities({ organization: "two" }))).toEqual(["From two"]);
  });

  it("filters by deadline", async () => {
    const org = await createOrganization();
    await createOpportunityFixture(org._id, { title: "Soon", deadline: daysFromNow(3) });
    await createOpportunityFixture(org._id, { title: "Later", deadline: daysFromNow(60) });

    const result = await listPublicOpportunities({ deadlineBefore: daysFromNow(10).toISOString() });
    expect(titlesOf(result)).toEqual(["Soon"]);
  });

  it("searches title, summary, description and organization name", async () => {
    const org = await createOrganization({ name: "Green Future Foundation" });
    const other = await createOrganization({ name: "Other Org" });
    await createOpportunityFixture(org._id, { title: "Climate Scholarship" });
    await createOpportunityFixture(other._id, { title: "Robotics", summary: "Build robots with us" });
    await createOpportunityFixture(other._id, { title: "Writing", description: "Weekly poetry workshop for everyone" });

    expect(titlesOf(await listPublicOpportunities({ q: "climate" }))).toEqual(["Climate Scholarship"]);
    expect(titlesOf(await listPublicOpportunities({ q: "build robots" }))).toEqual(["Robotics"]);
    expect(titlesOf(await listPublicOpportunities({ q: "POETRY" }))).toEqual(["Writing"]);
    expect(titlesOf(await listPublicOpportunities({ q: "green future" }))).toEqual(["Climate Scholarship"]);
  });

  it("treats regex characters in search as plain text", async () => {
    const org = await createOrganization();
    await createOpportunityFixture(org._id, { title: "C++ Workshop" });

    await expect(listPublicOpportunities({ q: "c++" })).resolves.toMatchObject({ total: 1 });
    await expect(listPublicOpportunities({ q: "(((" })).resolves.toMatchObject({ total: 0 });
  });

  it("ignores invalid params instead of failing", async () => {
    const org = await createOrganization();
    await createOpportunityFixture(org._id);

    const result = await listPublicOpportunities({ category: "banana", page: "abc", limit: "-4" });
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it("does not leak hidden listings through filters or search", async () => {
    const org = await createOrganization({ status: OrganizationStatus.SUSPENDED, name: "Secret Org" });
    await createOpportunityFixture(org._id, { title: "Secret", category: "club" });

    expect((await listPublicOpportunities({ category: "club" })).total).toBe(0);
    expect((await listPublicOpportunities({ q: "secret" })).total).toBe(0);
    expect((await listPublicOpportunities({ organization: org.slug })).total).toBe(0);
  });
});

describe("ordering and pagination", () => {
  it("sorts newest published first", async () => {
    const org = await createOrganization();
    await createOpportunityFixture(org._id, { title: "Old", publishedAt: daysFromNow(-10) });
    await createOpportunityFixture(org._id, { title: "New", publishedAt: daysFromNow(-1) });
    await createOpportunityFixture(org._id, { title: "Middle", publishedAt: daysFromNow(-5) });

    const { items } = await listPublicOpportunities();
    expect(items.map((i) => i.title)).toEqual(["New", "Middle", "Old"]);
  });

  it("paginates without overlap and reports totals", async () => {
    const org = await createOrganization();
    for (let i = 0; i < 5; i++) {
      await createOpportunityFixture(org._id, { title: `Item ${i}`, publishedAt: daysFromNow(-i) });
    }

    const first = await listPublicOpportunities({ limit: "2", page: "1" });
    const second = await listPublicOpportunities({ limit: "2", page: "2" });
    const third = await listPublicOpportunities({ limit: "2", page: "3" });

    expect(first).toMatchObject({ total: 5, totalPages: 3, page: 1, limit: 2 });
    expect(first.items.map((i) => i.title)).toEqual(["Item 0", "Item 1"]);
    expect(second.items.map((i) => i.title)).toEqual(["Item 2", "Item 3"]);
    expect(third.items.map((i) => i.title)).toEqual(["Item 4"]);
  });
});