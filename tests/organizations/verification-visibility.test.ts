import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { listPublicOpportunities } from "@/features/opportunities/service";
import {
  approveOrganization,
  suspendOrganization,
} from "@/features/organizations/service";
import { Opportunity } from "@/models/Opportunity";
import { OrganizationStatus } from "@/models/Organization";
import { UserRole } from "@/models/User";
import { clearTestDb, startTestDb, stopTestDb } from "../helpers/db";
import {
  createOpportunityFixture,
  createOrganization,
  createUser,
} from "../helpers/factories";

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

const total = async () => (await listPublicOpportunities()).total;

describe("moderation and public visibility", () => {
  it("keeps a pending organization's published listings hidden until it is approved", async () => {
    const admin = await createUser({ role: UserRole.ADMIN });
    const org = await createOrganization({
      status: OrganizationStatus.PENDING,
    });
    await createOpportunityFixture(org._id, { slug: "waiting" });

    expect(await total()).toBe(0);
    await approveOrganization(admin.id, org.id);
    expect(await total()).toBe(1);
  });

  it("hides listings when an organization is suspended, without deleting them", async () => {
    const admin = await createUser({ role: UserRole.ADMIN });
    const org = await createOrganization();
    await createOpportunityFixture(org._id, { slug: "live" });
    expect(await total()).toBe(1);

    await suspendOrganization(admin.id, org.id);

    expect(await total()).toBe(0);
    expect(await Opportunity.countDocuments({ organizationId: org._id })).toBe(
      1,
    );
  });

  it.each([OrganizationStatus.SUSPENDED, OrganizationStatus.REJECTED])(
    "shows listings again when a %s organization is approved",
    async (status) => {
      const admin = await createUser({ role: UserRole.ADMIN });
      const org = await createOrganization({ status });
      await createOpportunityFixture(org._id, { slug: "back-again" });
      expect(await total()).toBe(0);

      await approveOrganization(admin.id, org.id);

      expect(await total()).toBe(1);
    },
  );
});
