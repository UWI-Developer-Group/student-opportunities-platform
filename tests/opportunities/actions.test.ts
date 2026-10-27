import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { createOpportunity } from "@/features/opportunities/actions";
import { OpportunityStatus } from "@/features/opportunities/constants";
import { listPublicOpportunities } from "@/features/opportunities/service";
import { Opportunity } from "@/models/Opportunity";
import { OrganizationStatus } from "@/models/Organization";
import { UserRole } from "@/models/User";
import { clearTestDb, startTestDb, stopTestDb } from "../helpers/db";
import { createOrganization, createUser } from "../helpers/factories";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  mocks.headers.mockResolvedValue(new Headers());
  mocks.getSession.mockResolvedValue(null);
});

const validInput = {
  title: "Robotics Club Open Day",
  summary: "Come and meet the robotics club.",
  description: "A description that is comfortably longer than thirty characters.",
  category: "club",
  type: "in_person",
  applicationUrl: "https://example.com/apply",
};

async function signInAs(authProviderId: string) {
  mocks.getSession.mockResolvedValue({ user: { id: authProviderId } });
}

describe("createOpportunity action", () => {
  it("rejects unauthenticated requests without saving an opportunity", async () => {
    await expect(createOpportunity(validInput)).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(await Opportunity.countDocuments()).toBe(0);
  });

  it("rejects an authenticated user without an organization membership", async () => {
    const authProviderId = "provider-admin";
    await createUser({ role: UserRole.ADMIN, authProviderId });
    await signInAs(authProviderId);

    await expect(createOpportunity(validInput)).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(await Opportunity.countDocuments()).toBe(0);
  });

  it.each([OrganizationStatus.REJECTED, OrganizationStatus.SUSPENDED])(
    "rejects members of a %s organization",
    async (status) => {
    const organization = await createOrganization({ status });
    const authProviderId = "provider-member";
    await createUser({ authProviderId, organizationId: organization._id });
    await signInAs(authProviderId);

    await expect(createOpportunity(validInput)).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(await Opportunity.countDocuments()).toBe(0);
    },
  );

  it("publishes pending organizations' opportunities but hides them until approval", async () => {
    const organization = await createOrganization({ status: OrganizationStatus.PENDING });
    const authProviderId = "provider-member";
    await createUser({ authProviderId, organizationId: organization._id });
    await signInAs(authProviderId);

    const result = await createOpportunity(validInput);

    const stored = await Opportunity.findById(result.id);
    expect(stored?.status).toBe(OpportunityStatus.PUBLISHED);
    expect(stored?.publishedAt).toBeInstanceOf(Date);
    expect(stored?.organizationId.toString()).toBe(organization.id);
    expect(await Opportunity.countDocuments()).toBe(1);
    expect((await listPublicOpportunities()).total).toBe(0);

    await organization.updateOne({ status: OrganizationStatus.ACTIVE });
    expect((await listPublicOpportunities()).total).toBe(1);
  });

  it("creates an opportunity for the authenticated member's organization", async () => {
    const organization = await createOrganization();
    const otherOrganization = await createOrganization();
    const authProviderId = "provider-member";
    await createUser({ authProviderId, organizationId: organization._id });
    await signInAs(authProviderId);

    const result = await createOpportunity({
      ...validInput,
      organizationId: otherOrganization.id,
      status: OpportunityStatus.PUBLISHED,
    });

    const stored = await Opportunity.findById(result.id);
    expect(stored?.organizationId.toString()).toBe(organization.id);
    expect(stored?.status).toBe(OpportunityStatus.PUBLISHED);
    expect(stored?.publishedAt).toBeInstanceOf(Date);
  });

  it("rejects invalid data without saving an opportunity", async () => {
    const organization = await createOrganization();
    const authProviderId = "provider-member";
    await createUser({ authProviderId, organizationId: organization._id });
    await signInAs(authProviderId);

    await expect(
      createOpportunity({ ...validInput, applicationUrl: "javascript:alert(1)" }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(await Opportunity.countDocuments()).toBe(0);
  });
});
