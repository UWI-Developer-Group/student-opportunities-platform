import { describe, expect, it } from "vitest";
import { opportunityFiltersSchema } from "@/features/opportunities/filters";
import { createOpportunitySchema, updateOpportunitySchema } from "@/features/opportunities/schemas";
import { slugify } from "@/features/opportunities/slug";

const valid = {
  title: "Robotics Club Open Day",
  summary: "Come and meet the robotics club.",
  description: "A description that is comfortably longer than thirty characters.",
  category: "club",
  type: "in_person",
  applicationUrl: "https://example.com/apply",
};

describe("createOpportunitySchema", () => {
  it("accepts valid input and treats empty optional fields as missing", () => {
    const result = createOpportunitySchema.safeParse({ ...valid, location: "", deadline: "", imageUrl: "" });
    expect(result.success).toBe(true);
    expect(result.data?.deadline).toBeUndefined();
  });

  it.each(["javascript:alert(1)", "ftp://example.com", "not a url"])("rejects the link %s", (url) => {
    expect(createOpportunitySchema.safeParse({ ...valid, applicationUrl: url }).success).toBe(false);
    expect(createOpportunitySchema.safeParse({ ...valid, additionalLinks: [url] }).success).toBe(false);
  });

  it("rejects past deadlines and unknown categories", () => {
    expect(createOpportunitySchema.safeParse({ ...valid, deadline: "2020-01-01" }).success).toBe(false);
    expect(createOpportunitySchema.safeParse({ ...valid, category: "banana" }).success).toBe(false);
  });

  it("limits additional links to 10", () => {
    const links = Array.from({ length: 11 }, (_, i) => `https://example.com/${i}`);
    expect(createOpportunitySchema.safeParse({ ...valid, additionalLinks: links }).success).toBe(false);
  });
});

describe("updateOpportunitySchema", () => {
  it("allows partial updates and strips fields users must not set", () => {
    expect(updateOpportunitySchema.parse({ title: "A new longer title", status: "published", slug: "x" })).toEqual({
      title: "A new longer title",
    });
  });

  it("still validates fields that are provided", () => {
    expect(updateOpportunitySchema.safeParse({ applicationUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("opportunityFiltersSchema", () => {
  it("applies defaults and ignores invalid values", () => {
    expect(opportunityFiltersSchema.parse({ category: "banana", page: "abc", limit: "500", deadlineBefore: "nope" })).toEqual({
      page: 1,
      limit: 12,
    });
  });

  it("takes the first value of repeated params and lowercases the organization slug", () => {
    expect(opportunityFiltersSchema.parse({ type: ["online", "hybrid"], organization: "Tech-Society" })).toMatchObject({
      type: "online",
      organization: "tech-society",
    });
  });
});

describe("slugify", () => {
  it("produces clean url slugs", () => {
    expect(slugify("  Café & Robotics: Hardware Lead!! ")).toBe("cafe-robotics-hardware-lead");
    expect(slugify("!!!")).toBe("opportunity");
  });
});