import { Schema, Types } from "mongoose";
import { baseSchemaOptions, enumValues, getOrCreateModel } from "./shared";

export const OrganizationStatus = {
  PENDING: "pending",
  ACTIVE: "active",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
} as const;
export type OrganizationStatus =
  (typeof OrganizationStatus)[keyof typeof OrganizationStatus];

export interface IOrganization {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  contactEmail: string;
  status: OrganizationStatus;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 2000 },
    logoUrl: { type: String, trim: true },
    websiteUrl: { type: String, trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: enumValues(OrganizationStatus),
      default: OrganizationStatus.PENDING,
      index: true,
    },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  baseSchemaOptions
);

export const Organization = getOrCreateModel<IOrganization>(
  "Organization",
  organizationSchema
);