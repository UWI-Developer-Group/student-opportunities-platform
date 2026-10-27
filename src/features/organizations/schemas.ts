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

// Signed-in user registering an (additional) organization.
export const organizationDetailsSchema = z.object(organizationFields);

// New person registering an organization: account and organization together.
export const registerOrganizationSchema = z.object({
  ...accountFields,
  ...organizationFields,
});

export type OrganizationDetailsInput = z.infer<typeof organizationDetailsSchema>;
export type RegisterOrganizationInput = z.infer<typeof registerOrganizationSchema>;