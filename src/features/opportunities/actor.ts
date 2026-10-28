import type { UserRole } from "@/models/User";

// The signed-in user, as the opportunity commands need to see them.
export type Actor = {
  id: string;
  role: UserRole;
  organizationIds: string[]; // organizations the user belongs to
};