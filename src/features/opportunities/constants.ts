// Keep this file free of mongoose/server imports so client forms can use it.

export const OpportunityStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;
export type OpportunityStatus =
  (typeof OpportunityStatus)[keyof typeof OpportunityStatus];

export const OpportunityCategory = {
  SCHOLARSHIP: "scholarship",
  INTERNSHIP: "internship",
  COMPETITION: "competition",
  FELLOWSHIP: "fellowship",
  CLUB: "club",
  EVENT: "event",
  OTHER: "other",
} as const;
export type OpportunityCategory =
  (typeof OpportunityCategory)[keyof typeof OpportunityCategory];

export const OpportunityType = {
  ONLINE: "online",
  IN_PERSON: "in_person",
  HYBRID: "hybrid",
} as const;
export type OpportunityType = (typeof OpportunityType)[keyof typeof OpportunityType];

// Object values as a tuple, for z.enum() and Mongoose enum.
export function valuesOf<T extends Record<string, string>>(obj: T) {
  return Object.values(obj) as [T[keyof T], ...T[keyof T][]];
}