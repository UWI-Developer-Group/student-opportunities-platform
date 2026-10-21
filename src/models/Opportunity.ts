import { Schema, Types } from "mongoose";
import { baseSchemaOptions, getOrCreateModel } from "./shared";

import {
  OpportunityCategory,
  OpportunityStatus,
  OpportunityType,
  valuesOf,
} from "@/features/opportunities/constants";

// Re-exported for existing imports.
export { OpportunityCategory, OpportunityStatus, OpportunityType };

export interface IOpportunity {
  title: string;
  slug: string;
  summary: string;
  description: string;
  imageUrl?: string;
  organizationId: Types.ObjectId;
  category: OpportunityCategory;
  type: OpportunityType;
  location?: string;
  applicationUrl: string;
  additionalLinks: string[];
  deadline?: Date;
  status: OpportunityStatus;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const opportunitySchema = new Schema<IOpportunity>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    summary: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    category: { type: String, enum: valuesOf(OpportunityCategory), required: true },
    type: { type: String, enum: valuesOf(OpportunityType), required: true },
    location: { type: String, trim: true },
    applicationUrl: { type: String, required: true, trim: true },
    additionalLinks: { type: [String], default: [] },
    deadline: { type: Date },
    status: {
      type: String,
      enum: valuesOf(OpportunityStatus),
      default: OpportunityStatus.DRAFT,
    },
    publishedAt: { type: Date },
  },
  baseSchemaOptions
);

opportunitySchema.index({ status: 1, publishedAt: -1 });          // public listing
opportunitySchema.index({ organizationId: 1, status: 1 });        // dashboard + org page
opportunitySchema.index({ category: 1, status: 1 });              // category pages
opportunitySchema.index({ deadline: 1 });                         // deadline filter
opportunitySchema.index({ title: "text", summary: "text", description: "text" }); // search

export const Opportunity = getOrCreateModel<IOpportunity>(
  "Opportunity",
  opportunitySchema
);