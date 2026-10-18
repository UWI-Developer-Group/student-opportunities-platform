import { Schema, Types } from "mongoose";
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
  organizationId?: Types.ObjectId;
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
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      // Org members must belong to an organization; admins do not.
      required: function (this: IUser) {
        return this.role === UserRole.ORG_MEMBER;
      },
    },
    // select:false keeps the hash out of queries unless explicitly requested.
    passwordHash: { type: String, select: false },
    authProviderId: { type: String },
  },
  baseSchemaOptions
);

export const User = getOrCreateModel<IUser>("User", userSchema);