import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  addOrganizationMember,
  listOrganizationIdsForUser,
} from "@/features/organizations/memberships";
import { OrganizationMembership } from "@/models/OrganizationMembership";
import { clearTestDb, startTestDb, stopTestDb } from "../helpers/db";
import { createMemberOf, createOrganization, createUser } from "../helpers/factories";

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe("addOrganizationMember", () => {
  it("creates a membership and reports it was new", async () => {
    const org = await createOrganization();
    const user = await createUser();

    expect(await addOrganizationMember(user.id, org.id)).toBe(true);
    expect(await OrganizationMembership.countDocuments({})).toBe(1);
  });

  it("is safe to call twice: no duplicate, no error", async () => {
    const org = await createOrganization();
    const user = await createUser();

    await addOrganizationMember(user.id, org.id);
    expect(await addOrganizationMember(user.id, org.id)).toBe(false);
    expect(await OrganizationMembership.countDocuments({})).toBe(1);
  });

  it("lets the same user join a second organization", async () => {
    const [a, b] = [await createOrganization(), await createOrganization()];
    const user = await createUser();

    expect(await addOrganizationMember(user.id, a.id)).toBe(true);
    expect(await addOrganizationMember(user.id, b.id)).toBe(true);
  });
});

describe("listOrganizationIdsForUser", () => {
  it("returns every organization the user belongs to, as strings", async () => {
    const [a, b] = [await createOrganization(), await createOrganization()];
    const user = await createMemberOf(a, b);

    const ids = await listOrganizationIdsForUser(user.id);
    expect(ids.sort()).toEqual([a.id, b.id].sort());
  });

  it("returns an empty list for a user with no memberships", async () => {
    const user = await createUser();
    expect(await listOrganizationIdsForUser(user.id)).toEqual([]);
  });

  it("does not include organizations of other users", async () => {
    const [a, b] = [await createOrganization(), await createOrganization()];
    const mine = await createMemberOf(a);
    await createMemberOf(b);

    expect(await listOrganizationIdsForUser(mine.id)).toEqual([a.id]);
  });
});