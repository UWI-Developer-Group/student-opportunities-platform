import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createOpportunity } from "@/features/opportunities/commands";
import {
    approveOrganization,
    rejectOrganization,
    suspendOrganization,
} from "@/features/organizations/service";
import { Organization, OrganizationStatus } from "@/models/Organization";
import { UserRole } from "@/models/User";
import { clearTestDb, startTestReplicaSetDb, stopTestDb } from "../helpers/db";
import { actorFor, createMemberOf, createOrganization, createUser } from "../helpers/factories";

beforeAll(startTestReplicaSetDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

const { PENDING, ACTIVE, REJECTED, SUSPENDED } = OrganizationStatus;

const operations = [
  ["approveOrganization", approveOrganization, PENDING],
  ["rejectOrganization", rejectOrganization, PENDING],
  ["suspendOrganization", suspendOrganization, ACTIVE],
] as const;

const statusOf = async (id: string) => (await Organization.findById(id))?.status;
const newAdmin = () => createUser({ role: UserRole.ADMIN });

describe("approveOrganization", () => {
    it("makes a pending organization active and records who verified it", async () => {
        const admin = await newAdmin();
        const org = await createOrganization({ status: PENDING });

        const result = await approveOrganization(admin.id, org.id);

        expect(result).toMatchObject({ id: org.id, slug: org.slug, status: ACTIVE });
        const stored = await Organization.findById(org.id);
        expect(stored?.status).toBe(ACTIVE);
        expect(stored?.verifiedAt).toBeInstanceOf(Date);
        expect(stored?.verifiedBy?.toString()).toBe(admin.id);
    });

    it.each([SUSPENDED, REJECTED])("also works on a %s organization", async (status) => {
        const admin = await newAdmin();
        const org = await createOrganization({ status });

        await approveOrganization(admin.id, org.id);

        expect(await statusOf(org.id)).toBe(ACTIVE);
    });

      it("restores the members' ability to create opportunities after a suspension", async () => {
    const admin = await newAdmin();
    const org = await createOrganization({ status: ACTIVE });
    const member = await createMemberOf(org);
    const listing = {
      title: "Robotics Club Open Day",
      summary: "Come and meet the robotics club.",
      description: "A description that is comfortably longer than thirty characters.",
      category: "club",
      type: "in_person",
      applicationUrl: "https://example.com/apply",
    };
    const actor = await actorFor({ id: member.id, role: UserRole.ORG_MEMBER });

    await suspendOrganization(admin.id, org.id);
    await expect(createOpportunity(actor, org.id, listing)).rejects.toMatchObject({ code: "forbidden" });

    await approveOrganization(admin.id, org.id);
    await expect(createOpportunity(actor, org.id, listing)).resolves.toBeDefined();
  });




});

describe("rejectOrganization", () => {
    it("makes a pending organization rejected, without marking it verified", async () => {
        const admin = await newAdmin();
        const org = await createOrganization({ status: PENDING });

        const result = await rejectOrganization(admin.id, org.id);

        expect(result.status).toBe(REJECTED);
        const stored = await Organization.findById(org.id);
        expect(stored?.status).toBe(REJECTED);
        expect(stored?.verifiedAt).toBeUndefined();
        expect(stored?.verifiedBy).toBeUndefined();
    });
});

describe("suspendOrganization", () => {
    it("makes an active organization suspended", async () => {
        const admin = await newAdmin();
        const org = await createOrganization({ status: ACTIVE });

        const result = await suspendOrganization(admin.id, org.id);

        expect(result.status).toBe(SUSPENDED);
        expect(await statusOf(org.id)).toBe(SUSPENDED);
    });
});

describe("status changes that are not allowed", () => {
    it.each([
        ["approve", approveOrganization, ACTIVE],
        ["reject", rejectOrganization, ACTIVE],
        ["reject", rejectOrganization, REJECTED],
        ["reject", rejectOrganization, SUSPENDED],
        ["suspend", suspendOrganization, PENDING],
        ["suspend", suspendOrganization, REJECTED],
        ["suspend", suspendOrganization, SUSPENDED],
    ] as const)("cannot %s an organization that is %s", async (_label, operation, status) => {
        const admin = await newAdmin();
        const org = await createOrganization({ status });

        await expect(operation(admin.id, org.id)).rejects.toMatchObject({ code: "invalid_status" });

        expect(await statusOf(org.id)).toBe(status);
    });
});

describe.each(operations)("%s", (_name, operation, validStart) => {
    it("is forbidden for a member of that organization", async () => {
        const org = await createOrganization({ status: ACTIVE });
        const member = await createMemberOf(org);

        await expect(operation(member.id, org.id)).rejects.toMatchObject({ code: "forbidden" });

        expect(await statusOf(org.id)).toBe(ACTIVE);
    });

    it("is forbidden for an admin who does not exist, or a malformed admin id", async () => {
        const org = await createOrganization({ status: ACTIVE });

        for (const adminId of ["64b7f0f2f0f0f0f0f0f0f0f0", "not-an-id"]) {
            await expect(operation(adminId, org.id)).rejects.toMatchObject({ code: "forbidden" });
        }
        expect(await statusOf(org.id)).toBe(ACTIVE);
    });

    it("reports an unknown or malformed organization id as not found", async () => {
        const admin = await newAdmin();

        for (const id of ["64b7f0f2f0f0f0f0f0f0f0f0", "not-an-id"]) {
            await expect(operation(admin.id, id)).rejects.toMatchObject({ code: "not_found" });
        }
    });

    it("only touches the organization it is given", async () => {
    const admin = await newAdmin();
    const [target, other] = [
      await createOrganization({ status: validStart }),
      await createOrganization({ status: validStart }),
    ];

    await operation(admin.id, target.id);

    expect(await statusOf(other.id)).toBe(validStart);
  });
});