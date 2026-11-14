import { z } from "zod";


const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

// http(s) only: .url() alone allows "javascript:" links, and this value is rendered as <a href>.
const httpUrl = z
  .string()
  .trim()
  .url({ message: "Must be a valid URL" })
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "URL must start with http:// or https://",
  });

const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

const email = z.string().trim().toLowerCase().email({ message: "Enter a valid email" }).max(254);

// The person registering. Password is not trimmed: spaces may be intentional.
const accountFields = {
  name: z.string().trim().min(2, "Name is too short").max(120),
  email,
  password: z.string().min(8, "Use at least 8 characters").max(128, "Password is too long"),
};

// The organization being registered. Status, slug and verification are set by the server.
const organizationFields = {
  organizationName: z.string().trim().min(2, "Organization name is too short").max(120),
  // Required: it is what an admin reads when deciding whether to approve.
  description: z
    .string()
    .trim()
    .min(20, "Tell us a little more about the organization")
    .max(2000),
  websiteUrl: optional(httpUrl),
  contactEmail: optional(email), // defaults to the account email
};



// Accepts http(s) links only. A blank string means "remove the link".
const isHttpUrl = (value: string) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

const clearableUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === "" || isHttpUrl(value), {
    message: "Must be a valid URL starting with http:// or https://",
  })
  .optional();

// Profile edits. Every field is optional (omitted = unchanged), but at least one is required.
// Status, slug, contact email and verification are deliberately not here: unknown keys are stripped.
export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2, "Organization name is too short").max(120).optional(),
    description: z
      .string()
      .trim()
      .min(20, "Tell us a little more about the organization")
      .max(2000)
      .optional(),
    websiteUrl: clearableUrl,
    logoUrl: clearableUrl,
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Provide at least one field to update",
  });

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;







// Signed-in user registering an (additional) organization.
export const organizationDetailsSchema = z.object(organizationFields);

// New person registering an organization: account and organization together.
export const registerOrganizationSchema = z.object({
  ...accountFields,
  ...organizationFields,
});

export type OrganizationDetailsInput = z.infer<typeof organizationDetailsSchema>;
export type RegisterOrganizationInput = z.infer<typeof registerOrganizationSchema>;