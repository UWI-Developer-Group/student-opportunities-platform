import mongoose, { Schema, Types } from "mongoose";

export const OPPORTUNITY_STATUSES = ["draft", "published", "archived"] as const;

export interface Opportunity {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  summary: string;
  description?: string;
  imageUrl?: string;
  organizationId: Types.ObjectId;
  category: string;
  type: string;
  applicationUrl: string;
  deadline?: Date;
  status: (typeof OPPORTUNITY_STATUSES)[number];
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const opportunitySchema = new Schema<Opportunity>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    summary: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    category: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    applicationUrl: { type: String, required: true, trim: true },
    deadline: { type: Date },
    status: {
      type: String,
      enum: OPPORTUNITY_STATUSES,
      default: "draft",
      required: true,
    },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

opportunitySchema.index({ status: 1, publishedAt: -1 });
opportunitySchema.index({ organizationId: 1, status: 1 });
opportunitySchema.index({ category: 1, status: 1, publishedAt: -1 });

export const OpportunityModel =
  mongoose.models.Opportunity ??
  mongoose.model<Opportunity>("Opportunity", opportunitySchema);

export type ActiveOrganizationSummary = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  logoUrl?: string;
  status: "active";
};
