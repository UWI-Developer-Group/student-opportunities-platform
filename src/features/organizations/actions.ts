"use server";

import { redirect } from "next/navigation";
import { z, ZodError } from "zod";
import { AuthError } from "@/features/auth/errors";
import { requireUser } from "@/features/auth/permissions";
import { registerOrganization } from "./registration";
import { createPendingOrganization, OrganizationError } from "./service";

// Where a person lands after registering. They are signed in and their organization is pending.
const AFTER_REGISTRATION_PATH = "/dashboard";

// What the form shows. `values` lets the form refill itself; the password is never sent back.
export type FormState =
  | {
      message?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      values?: Record<string, string>;
    }
  | undefined;

function submittedValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && key !== "password" && !key.startsWith("$ACTION")) {
      values[key] = value;
    }
  }
  return values;
}

function toFormState(error: unknown, formData: FormData): FormState {
  const values = submittedValues(formData);

  if (error instanceof ZodError) {
    return {
      message: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(error).fieldErrors,
      values,
    };
  }
  if (error instanceof OrganizationError) {
    // These messages are written for people to read.
    return {
      message: error.message,
      fieldErrors: error.code === "email_taken" ? { email: [error.message] } : undefined,
      values,
    };
  }
  if (error instanceof AuthError) {
    return {
      message:
        error.code === "unauthenticated"
          ? "Please sign in to continue."
          : "You are not allowed to do that.",
      values,
    };
  }

  console.error("Organization registration failed:", error);
  return { message: "Something went wrong. Please try again.", values };
}

// New person: creates the account and the pending organization together.
export async function registerOrganizationAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await registerOrganization(Object.fromEntries(formData));
  } catch (error) {
    return toFormState(error, formData);
  }
  redirect(AFTER_REGISTRATION_PATH); // outside try/catch: redirect works by throwing
}

// Already signed in: adds another pending organization to the current account.
// This is also how someone finishes after "account created, organization not saved".
export async function addOrganizationAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireUser();
    await createPendingOrganization(user.id, Object.fromEntries(formData));
  } catch (error) {
    return toFormState(error, formData);
  }
  redirect(AFTER_REGISTRATION_PATH);
}