import "server-only";
import { randomBytes } from "node:crypto";
import { Opportunity } from "@/models/Opportunity";

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 80)
      .replace(/^-+|-+$/g, "") || "opportunity"
  );
}

// Plain slug if free, otherwise add a short random suffix.
// The unique index still guards against a race between two creates.
export async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  if (!(await Opportunity.exists({ slug: base }))) return base;
  return `${base}-${randomBytes(3).toString("hex")}`;
}