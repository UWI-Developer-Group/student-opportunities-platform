import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/organizations/route";
import { Organization, OrganizationStatus } from "@/models/Organization";
import { User, UserRole } from "@/models/User";
import { clearTestDb, startTestDb, stopTestDb } from "../helpers/db";

const mocks = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { signUpEmail: mocks.signUpEmail } },
}));

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  mocks.signUpEmail.mockResolvedValue({ user: { id: "better-auth-member-id" } });
});

const registration = {
  organizationName: "Robotics Club",
  description: "A club for students interested in robotics.",
  websiteUrl: "https://robotics.example.com",
  contactEmail: "contact@robotics.example.com",
  memberName: "Club Member",
  memberEmail: "member@robotics.example.com",
  password: "a-secure-test-password",
};

function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/organizations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "localhost:3000",
      origin,
    },
    body: JSON.stringify(body),
  });
}

describe("organization registration API", () => {
  it("creates a Better Auth account, pending organization, and linked member", async () => {
    const response = await POST(request(registration));
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.organization).toMatchObject({
      slug: "robotics-club",
      status: OrganizationStatus.PENDING,
    });
    expect(mocks.signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          name: registration.memberName,
          email: registration.memberEmail,
          password: registration.password,
        },
      }),
    );

    const organization = await Organization.findOne({ slug: "robotics-club" });
    const member = await User.findOne({ email: registration.memberEmail });
    expect(member).toMatchObject({
      name: registration.memberName,
      role: UserRole.ORG_MEMBER,
      authProviderId: "better-auth-member-id",
    });
    expect(member?.organizationId?.toString()).toBe(organization?.id);
  });

  it("rejects invalid data before creating an auth account or records", async () => {
    const response = await POST(request({ ...registration, password: "short" }));

    expect(response.status).toBe(400);
    expect(mocks.signUpEmail).not.toHaveBeenCalled();
    expect(await Organization.countDocuments()).toBe(0);
    expect(await User.countDocuments()).toBe(0);
  });

  it("rejects an existing organization slug before creating an auth account", async () => {
    await Organization.create({
      name: registration.organizationName,
      slug: "robotics-club",
      contactEmail: registration.contactEmail,
      status: OrganizationStatus.PENDING,
    });

    const response = await POST(request(registration));

    expect(response.status).toBe(409);
    expect(mocks.signUpEmail).not.toHaveBeenCalled();
  });

  it("removes the pending organization when the login email is already registered", async () => {
    mocks.signUpEmail.mockRejectedValue(new Error("User already exists"));

    const response = await POST(request(registration));

    expect(response.status).toBe(409);
    expect(await Organization.countDocuments()).toBe(0);
    expect(await User.countDocuments()).toBe(0);
  });

  it("rejects requests from a different origin", async () => {
    const response = await POST(request(registration, "https://attacker.example"));

    expect(response.status).toBe(403);
    expect(mocks.signUpEmail).not.toHaveBeenCalled();
    expect(await Organization.countDocuments()).toBe(0);
  });
});
