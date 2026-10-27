import { z, ZodError } from "zod";
import { connectToDatabase } from "@/lib/db";
import { isSameOriginRequest } from "@/lib/request-origin";
import { auth } from "@/lib/auth";
import { Organization, OrganizationStatus } from "@/models/Organization";
import { User, UserRole } from "@/models/User";

const registrationSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  websiteUrl: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .trim()
      .url()
      .refine((value) => /^https?:\/\//i.test(value), "Website must use http or https")
      .optional(),
  ),
  contactEmail: z.email(),
  memberName: z.string().trim().min(2).max(120),
  memberEmail: z.email(),
  password: z.string().min(8).max(128),
});

function organizationSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "organization"
  );
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request origin is not allowed" }, { status: 403 });
  }

  let input: z.infer<typeof registrationSchema>;
  try {
    input = registrationSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Organization registration data is invalid", issues: error.issues },
        { status: 400 },
      );
    }
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  await connectToDatabase();
  const slug = organizationSlug(input.organizationName);
  if (await Organization.exists({ slug })) {
    return Response.json(
      { error: "An organization with a similar name already exists" },
      { status: 409 },
    );
  }
  if (await User.exists({ email: input.memberEmail.toLowerCase() })) {
    return Response.json(
      { error: "A member account with this email already exists" },
      { status: 409 },
    );
  }

  const organization = await Organization.create({
    name: input.organizationName,
    slug,
    description: input.description,
    websiteUrl: input.websiteUrl,
    contactEmail: input.contactEmail,
    status: OrganizationStatus.PENDING,
  });

  let authUserId: string;
  try {
    const result = await auth.api.signUpEmail({
      headers: request.headers,
      body: {
        name: input.memberName,
        email: input.memberEmail,
        password: input.password,
      },
    });
    authUserId = result.user.id;
  } catch {
    await Organization.deleteOne({ _id: organization._id });
    return Response.json(
      { error: "Could not create the login account. The email may already be registered." },
      { status: 409 },
    );
  }

  try {
    await User.create({
      name: input.memberName,
      email: input.memberEmail,
      role: UserRole.ORG_MEMBER,
      organizationId: organization._id,
      authProviderId: authUserId,
    });

    return Response.json(
      {
        organization: { id: organization.id, slug: organization.slug, status: organization.status },
        member: { email: input.memberEmail },
      },
      { status: 201 },
    );
  } catch (error) {
    await Organization.deleteOne({ _id: organization._id });
    console.error("Organization registration failed after account creation:", error);
    return Response.json(
      {
        error:
          "The login account was created, but organization setup failed. Contact an administrator before retrying.",
      },
      { status: 500 },
    );
  }
}
