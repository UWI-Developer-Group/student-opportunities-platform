import "server-only";
import type { PipelineStage } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { OrganizationModel } from "@/models/Organization";
import {
  OpportunityModel,
  type Opportunity,
} from "@/models/Opportunity";

export type PublicOpportunity = Omit<Opportunity, "organizationId"> & {
  organization: {
    _id: Opportunity["organizationId"];
    name: string;
    slug: string;
    logoUrl?: string;
    status: "active";
  };
};

export async function findPublicOpportunities(): Promise<PublicOpportunity[]> {
  await connectToDatabase();

  return OpportunityModel.aggregate<PublicOpportunity>(
    publicOpportunityPipeline(),
  ).exec();
}

export async function findPublicOpportunityBySlug(
  slug: string,
): Promise<PublicOpportunity | null> {
  await connectToDatabase();
  const [opportunity] = await OpportunityModel.aggregate<PublicOpportunity>(
    publicOpportunityPipeline(slug),
  ).exec();

  return opportunity ?? null;
}

function publicOpportunityPipeline(slug?: string): PipelineStage[] {
  return [
    {
      $match: {
        status: "published",
        ...(slug ? { slug } : {}),
      },
    },
    {
      $lookup: {
        from: OrganizationModel.collection.name,
        localField: "organizationId",
        foreignField: "_id",
        as: "organization",
      },
    },
    { $unwind: "$organization" },
    { $match: { "organization.status": "active" } },
    {
      $project: {
        title: 1,
        slug: 1,
        summary: 1,
        description: 1,
        imageUrl: 1,
        category: 1,
        type: 1,
        applicationUrl: 1,
        deadline: 1,
        status: 1,
        publishedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        organization: {
          _id: "$organization._id",
          name: "$organization.name",
          slug: "$organization.slug",
          logoUrl: "$organization.logoUrl",
          status: "$organization.status",
        },
      },
    },
    { $sort: { publishedAt: -1 } },
  ];
}
