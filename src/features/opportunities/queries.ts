import "server-only";
import type { PipelineStage, Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Opportunity } from "@/models/Opportunity";
import { Organization, OrganizationStatus } from "@/models/Organization";
import { OpportunityStatus } from "./constants";
import type { OpportunityFilters } from "./filters";
import type { PaginatedResult, PublicOpportunity } from "./types";

type Criteria = Partial<Omit<OpportunityFilters, "page" | "limit">> & {
  slug?: string;
};

type RawPublicOpportunity = Omit<PublicOpportunity, "id" | "organization"> & {
  _id: Types.ObjectId;
  organization: Omit<PublicOpportunity["organization"], "id"> & {
    _id: Types.ObjectId;
  };
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Opportunity-level filters run first so they can use indexes.
function opportunityMatch(c: Criteria): PipelineStage.Match["$match"] {
  return {
    status: OpportunityStatus.PUBLISHED,
    ...(c.slug ? { slug: c.slug.toLowerCase() } : {}),
    ...(c.category ? { category: c.category } : {}),
    ...(c.type ? { type: c.type } : {}),
    ...(c.deadlineBefore ? { deadline: { $lte: c.deadlineBefore } } : {}),
  };
}

// Organization-level filters run after the lookup.
function organizationMatch(c: Criteria): PipelineStage.Match["$match"] {
  const match: PipelineStage.Match["$match"] = {
    "organization.status": OrganizationStatus.ACTIVE,
  };

  if (c.organization) match["organization.slug"] = c.organization;

  if (c.q) {
    const regex = new RegExp(escapeRegex(c.q), "i");
    match.$or = [
      { title: regex },
      { summary: regex },
      { description: regex },
      { "organization.name": regex },
    ];
  }
  return match;
}

function baseStages(c: Criteria): PipelineStage[] {
  return [
    { $match: opportunityMatch(c) },
    { $sort: { publishedAt: -1, _id: -1 } },
    {
      $lookup: {
        from: Organization.collection.name,
        localField: "organizationId",
        foreignField: "_id",
        as: "organization",
      },
    },
    { $unwind: "$organization" },
    { $match: organizationMatch(c) },
  ];
}

const projectStage: PipelineStage.Project = {
  $project: {
    title: 1,
    slug: 1,
    summary: 1,
    description: 1,
    imageUrl: 1,
    category: 1,
    type: 1,
    location: 1,
    applicationUrl: 1,
    additionalLinks: 1,
    deadline: 1,
    publishedAt: 1,
    createdAt: 1,
    updatedAt: 1,
    organization: {
      _id: "$organization._id",
      name: "$organization.name",
      slug: "$organization.slug",
      logoUrl: "$organization.logoUrl",
    },
  },
};

// ObjectIds become strings so results can be passed to client components.
function toPublicOpportunity({
  _id,
  organization: { _id: organizationId, ...organization },
  ...rest
}: RawPublicOpportunity): PublicOpportunity {
  return {
    ...rest,
    id: _id.toString(),
    organization: { ...organization, id: organizationId.toString() },
  };
}

export async function findPublicOpportunities(
  filters: OpportunityFilters,
): Promise<PaginatedResult<PublicOpportunity>> {
  await connectToDatabase();
  const { page, limit, ...criteria } = filters;

  const [result] = await Opportunity.aggregate<{
    items: RawPublicOpportunity[];
    total: { count: number }[];
  }>([
    ...baseStages(criteria),
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }, projectStage],
        total: [{ $count: "count" }],
      },
    },
  ]).exec();

  const total = result?.total[0]?.count ?? 0;

  return {
    items: (result?.items ?? []).map(toPublicOpportunity),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function findPublicOpportunityBySlug(
  slug: string,
): Promise<PublicOpportunity | null> {
  await connectToDatabase();

  const [opportunity] = await Opportunity.aggregate<RawPublicOpportunity>([
    ...baseStages({ slug }),
    { $limit: 1 },
    projectStage,
  ]).exec();

  return opportunity ? toPublicOpportunity(opportunity) : null;
}