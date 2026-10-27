import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  archiveOpportunity,
  createOpportunity,
  publishOpportunity,
  updateOpportunity,
} from "@/features/opportunities/commands";
import { OpportunityStatus } from "@/features/opportunities/constants";
import { listPublicOpportunities } from "@/features/opportunities/service";
import { Opportunity } from "@/models/Opportunity";
import { OrganizationStatus } from "@/models/Organization";
import { UserRole } from "@/models/User";
import { clearTestDb, startTestDb, stopTestDb } from "../helpers/db";
import {
  actorFor,
  createMemberOf,
  createOpportunityFixture,
  createOrganization,
  createUser,
  daysFromNow,
} from "../helpers/factories";

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

const validInput = {
  title: "Robotics Club Open Day",
  summary: "Come and meet the robotics club.",
  description: "A description that is comfortably longer than thirty characters.",
  category: "club",
  type: "in_person",
  applicationUrl: "https://example.com/apply",
};

async function memberOf(status: OrganizationStatus = OrganizationStatus.ACTIVE) {
  const organization = await createOrganization({ status });
  const user = await createMemberOf(organization);
  return { organization, actor: await actorFor(user) };
}

async function adminActor() {
  return actorFor(await createUser({ role: UserRole.ADMIN }));
}

const draftIn = (organizationId: unknown, overrides = {}) =>
  createOpportunityFixture(organizationId as string, {
    status: OpportunityStatus.DRAFT,
    publishedAt: undefined,
    ...overrides,
  });

describe("createOpportunity", () => {
  it("creates a draft in the chosen organization with a generated slug", async () => {
    const { organization, actor } = await memberOf();

    const created = await createOpportunity(actor, organization.id, validInput);

    expect(created).toMatchObject({ slug: "robotics-club-open-day", status: OpportunityStatus.DRAFT });
    const stored = await Opportunity.findById(created.id);
    expect(stored?.organizationId.toString()).toBe(organization.id);
  });

  it("gives a second opportunity with the same title a different slug", async () => {
    const { organization, actor } = await memberOf();

    const first = await createOpportunity(actor, organization.id, validInput);
    const second = await createOpportunity(actor, organization.id, validInput);

    expect(second.slug).not.toBe(first.slug);
    expect(second.slug.startsWith("robotics-club-open-day-")).toBe(true);
  });

  it("lets a member of several organizations create in each of them", async () => {
    const [a, b] = [await createOrganization(), await createOrganization()];
    const actor = await actorFor(await createMemberOf(a, b));

    const inA = await createOpportunity(actor, a.id, validInput);
    const inB = await createOpportunity(actor, b.id, { ...validInput, title: "Second listing title" });

    expect((await Opportunity.findById(inA.id))?.organizationId.toString()).toBe(a.id);
    expect((await Opportunity.findById(inB.id))?.organizationId.toString()).toBe(b.id);
  });

  it("is forbidden for an organization the user does not belong to", async () => {
    const mine = await memberOf();
    const other = await createOrganization();

    await expect(createOpportunity(mine.actor, other.id, validInput)).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(await Opportunity.countDocuments({})).toBe(0);
  });

  it("is forbidden for a member of one organization acting for another they are not in, even with several memberships", async () => {
    const [a, b, c] = [await createOrganization(), await createOrganization(), await createOrganization()];
    const actor = await actorFor(await createMemberOf(a, b));

    await expect(createOpportunity(actor, c.id, validInput)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("ignores status and organizationId smuggled into the input", async () => {
    const { organization, actor } = await memberOf();
    const other = await createOrganization();

    const created = await createOpportunity(actor, organization.id, {
      ...validInput,
      status: "published",
      organizationId: other.id,
    });

    const stored = await Opportunity.findById(created.id);
    expect(stored?.status).toBe(OpportunityStatus.DRAFT);
    expect(stored?.organizationId.toString()).toBe(organization.id);
  });

  it.each([OrganizationStatus.PENDING, OrganizationStatus.SUSPENDED, OrganizationStatus.REJECTED])(
    "is forbidden when the organization is %s",
    async (status) => {
      const { organization, actor } = await memberOf(status);
      await expect(createOpportunity(actor, organization.id, validInput)).rejects.toMatchObject({
        code: "forbidden",
      });
    },
  );

  it("is forbidden for admins and for users with no organizations", async () => {
    const organization = await createOrganization();

    await expect(createOpportunity(await adminActor(), organization.id, validInput)).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(
      createOpportunity({ id: "x", role: UserRole.ORG_MEMBER, organizationIds: [] }, organization.id, validInput),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects invalid input", async () => {
    const { organization, actor } = await memberOf();
    await expect(
      createOpportunity(actor, organization.id, { ...validInput, applicationUrl: "javascript:alert(1)" }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe("updateOpportunity", () => {
  it("lets a member edit their own opportunity without changing the slug", async () => {
    const { organization, actor } = await memberOf();
    const opportunity = await draftIn(organization._id, { slug: "stable-slug" });

    await updateOpportunity(actor, opportunity.id, { title: "A brand new title" });

    const stored = await Opportunity.findById(opportunity._id);
    expect(stored?.title).toBe("A brand new title");
    expect(stored?.slug).toBe("stable-slug");
  });

  it("stops Org A editing Org B's opportunity", async () => {
    const a = await memberOf();
    const b = await memberOf();
    const opportunity = await draftIn(b.organization._id, { title: "Original title" });

    await expect(
      updateOpportunity(a.actor, opportunity.id, { title: "Hijacked title" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect((await Opportunity.findById(opportunity._id))?.title).toBe("Original title");
  });

  it("lets a member of two organizations edit opportunities in both, but not a third", async () => {
    const [a, b, c] = [await createOrganization(), await createOrganization(), await createOrganization()];
    const actor = await actorFor(await createMemberOf(a, b));
    const inA = await draftIn(a._id);
    const inB = await draftIn(b._id);
    const inC = await draftIn(c._id, { title: "Original title" });

    await updateOpportunity(actor, inA.id, { title: "Edited in A" });
    await updateOpportunity(actor, inB.id, { title: "Edited in B" });
    await expect(updateOpportunity(actor, inC.id, { title: "Hijacked title" })).rejects.toMatchObject({
      code: "forbidden",
    });

    expect((await Opportunity.findById(inA._id))?.title).toBe("Edited in A");
    expect((await Opportunity.findById(inB._id))?.title).toBe("Edited in B");
    expect((await Opportunity.findById(inC._id))?.title).toBe("Original title");
  });

  it("lets any member of the same organization edit its opportunities", async () => {
    const organization = await createOrganization();
    const first = await actorFor(await createMemberOf(organization));
    const second = await actorFor(await createMemberOf(organization));
    const opportunity = await draftIn(organization._id);

    await updateOpportunity(first, opportunity.id, { title: "Edited by first" });
    await updateOpportunity(second, opportunity.id, { title: "Edited by second" });

    expect((await Opportunity.findById(opportunity._id))?.title).toBe("Edited by second");
  });

  it("lets an admin edit any opportunity", async () => {
    const { organization } = await memberOf();
    const opportunity = await draftIn(organization._id);

    await updateOpportunity(await adminActor(), opportunity.id, { title: "Edited by admin" });
    expect((await Opportunity.findById(opportunity._id))?.title).toBe("Edited by admin");
  });

  it("cannot change status through update input", async () => {
    const { organization, actor } = await memberOf();
    const opportunity = await draftIn(organization._id);

    await updateOpportunity(actor, opportunity.id, { status: "published" });
    expect((await Opportunity.findById(opportunity._id))?.status).toBe(OpportunityStatus.DRAFT);
  });

  it("reports not_found for unknown or malformed ids", async () => {
    const { actor } = await memberOf();
    await expect(updateOpportunity(actor, "not-an-id", {})).rejects.toMatchObject({ code: "not_found" });
    await expect(updateOpportunity(actor, "64b7f0f2f0f0f0f0f0f0f0f0", {})).rejects.toMatchObject({
      code: "not_found",
    });
  });
});

describe("publishOpportunity", () => {
  it("publishes a valid draft and sets publishedAt", async () => {
    const { organization, actor } = await memberOf();
    const opportunity = await draftIn(organization._id, { slug: "going-live", deadline: daysFromNow(10) });

    const result = await publishOpportunity(actor, opportunity.id);

    expect(result.status).toBe(OpportunityStatus.PUBLISHED);
    expect((await Opportunity.findById(opportunity._id))?.publishedAt).toBeInstanceOf(Date);
    expect((await listPublicOpportunities()).total).toBe(1);
  });

  it.each([OrganizationStatus.PENDING, OrganizationStatus.SUSPENDED])(
    "is forbidden when the organization is %s",
    async (status) => {
      const { organization, actor } = await memberOf(status);
      const opportunity = await draftIn(organization._id);

      await expect(publishOpportunity(actor, opportunity.id)).rejects.toMatchObject({ code: "forbidden" });
      expect((await Opportunity.findById(opportunity._id))?.status).toBe(OpportunityStatus.DRAFT);
    },
  );

  it("stops Org A publishing Org B's opportunity", async () => {
    const a = await memberOf();
    const b = await memberOf();
    const opportunity = await draftIn(b.organization._id);

    await expect(publishOpportunity(a.actor, opportunity.id)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("refuses to publish an opportunity whose deadline has passed", async () => {
    const { organization, actor } = await memberOf();
    const opportunity = await draftIn(organization._id, { deadline: daysFromNow(-3) });

    await expect(publishOpportunity(actor, opportunity.id)).rejects.toBeInstanceOf(ZodError);
  });

  it("is idempotent for already-published opportunities", async () => {
    const { organization, actor } = await memberOf();
    const opportunity = await createOpportunityFixture(organization._id);
    const before = (await Opportunity.findById(opportunity._id))?.publishedAt;

    await publishOpportunity(actor, opportunity.id);
    expect((await Opportunity.findById(opportunity._id))?.publishedAt).toEqual(before);
  });
});

describe("archiveOpportunity", () => {
  it("archives without deleting and removes it from public listings", async () => {
    const { organization, actor } = await memberOf();
    const opportunity = await createOpportunityFixture(organization._id);
    expect((await listPublicOpportunities()).total).toBe(1);

    await archiveOpportunity(actor, opportunity.id);

    expect((await Opportunity.findById(opportunity._id))?.status).toBe(OpportunityStatus.ARCHIVED);
    expect((await listPublicOpportunities()).total).toBe(0);
  });

  it("stops Org A archiving Org B's opportunity", async () => {
    const a = await memberOf();
    const b = await memberOf();
    const opportunity = await createOpportunityFixture(b.organization._id);

    await expect(archiveOpportunity(a.actor, opportunity.id)).rejects.toMatchObject({ code: "forbidden" });
    expect((await Opportunity.findById(opportunity._id))?.status).toBe(OpportunityStatus.PUBLISHED);
  });
});