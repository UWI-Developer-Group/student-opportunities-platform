import { Schema } from "mongoose";
import { baseSchemaOptions, enumValues, getOrCreateModel } from "./shared";

export const UserRole = {
  ORG_MEMBER: "org_member",
  ADMIN: "admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface IUser {
  name: string;
  email: string;
  role: UserRole;
  passwordHash?: string;
  authProviderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: enumValues(UserRole), default: UserRole.ORG_MEMBER },
    // Hidden from queries by default.
    passwordHash: { type: String, select: false },
    // Better Auth's user id. Unique, but optional (sparse) so seeded users can omit it.
    authProviderId: { type: String, unique: true, sparse: true },
  },
  baseSchemaOptions
);

export const User = getOrCreateModel<IUser>("User", userSchema);