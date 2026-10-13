import mongoose, { Schema, Types } from "mongoose";

export const ORGANIZATION_STATUSES = [
  "pending",
  "active",
  "rejected",
  "suspended",
] as const;

export interface Organization {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  contactEmail?: string;
  status: (typeof ORGANIZATION_STATUSES)[number];
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<Organization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    websiteUrl: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ORGANIZATION_STATUSES,
      default: "pending",
      required: true,
    },
    verifiedAt: { type: Date },
  },
  { timestamps: true },
);

export const OrganizationModel =
  mongoose.models.Organization ??
  mongoose.model<Organization>("Organization", organizationSchema);
