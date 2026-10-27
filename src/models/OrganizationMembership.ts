import { Schema, Types } from "mongoose";
import { baseSchemaOptions, getOrCreateModel } from "./shared";

// Links one user to one organization. No roles: all members have equal permissions. Members is going to be annoying to implement.
export interface IOrganizationMembership {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const organizationMembershipSchema = new Schema<IOrganizationMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true, // "who belongs to this organization"
    },
  },
  baseSchemaOptions
);

// Blocks duplicates, and also serves "which organizations does this user belong to".
organizationMembershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

export const OrganizationMembership = getOrCreateModel<IOrganizationMembership>(
  "OrganizationMembership",
  organizationMembershipSchema
);