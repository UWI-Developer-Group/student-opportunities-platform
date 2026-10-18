// Run: npm run seed
// Upserts by slug/email, never deletes, safe to re-run.
// Connects directly: @/lib/db imports "server-only", which throws outside Next.js.
import mongoose from "mongoose";
import {
  OpportunityCategory,
  OpportunityStatus,
  OpportunityType,
} from "@/features/opportunities/constants";
import { Opportunity } from "@/models/Opportunity";
import { Organization, OrganizationStatus } from "@/models/Organization";
import { User, UserRole } from "@/models/User";

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);

const toSlug = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ---------- Data ---------- */

const ADMIN_EMAIL = "admin@seed.test";

const organizations = [
  { slug: "tech-society", name: "Tech Society", status: OrganizationStatus.ACTIVE,
    description: "Student community for software, data and hardware projects." },
  { slug: "green-future-foundation", name: "Green Future Foundation", status: OrganizationStatus.ACTIVE,
    description: "Funds climate research and sustainability programmes for students." },
  { slug: "campus-robotics-club", name: "Campus Robotics Club", status: OrganizationStatus.ACTIVE,
    description: "Builds and competes with robots. Open to all majors." },
  { slug: "bright-minds-initiative", name: "Bright Minds Initiative", status: OrganizationStatus.PENDING,
    description: "Peer tutoring initiative awaiting admin approval." },
  { slug: "quick-cash-scholarships", name: "Quick Cash Scholarships", status: OrganizationStatus.SUSPENDED,
    description: "Suspended organization, used to test visibility rules." },
].map((org) => ({
  ...org,
  contactEmail: `${org.slug}@seed.test`,
  websiteUrl: `https://example.com/${org.slug}`,
}));

const FILLER =
  "Full details, eligibility and how to apply are on the application page.";

type SeedOpportunity = {
  org: string;
  title: string;
  category: OpportunityCategory;
  type: OpportunityType;
  status: OpportunityStatus;
  summary: string;
  deadline?: Date;
  publishedDaysAgo?: number;
};

const { SCHOLARSHIP, INTERNSHIP, COMPETITION, FELLOWSHIP, EVENT, CLUB, OTHER } =
  OpportunityCategory;
const { ONLINE, IN_PERSON, HYBRID } = OpportunityType;
const { DRAFT, PUBLISHED, ARCHIVED } = OpportunityStatus;

const opportunities: SeedOpportunity[] = [
  // Tech Society (active)
  { org: "tech-society", title: "Software Engineering Internship, Summer Cohort", category: INTERNSHIP, type: HYBRID, status: PUBLISHED,
    summary: "Ten-week paid internship working on real student-facing products.", deadline: daysFromNow(30), publishedDaysAgo: 2 },
  { org: "tech-society", title: "Hackathon: Build for Campus", category: COMPETITION, type: IN_PERSON, status: PUBLISHED,
    summary: "48-hour hackathon with prizes for the best campus-improving project.", deadline: daysFromNow(14), publishedDaysAgo: 5 },
  { org: "tech-society", title: "Data Science Fellowship", category: FELLOWSHIP, type: ONLINE, status: PUBLISHED,
    summary: "Six-month mentored fellowship for students interested in data science.", publishedDaysAgo: 9 },
  { org: "tech-society", title: "Mobile App Workshop Series", category: EVENT, type: IN_PERSON, status: DRAFT,
    summary: "Draft: weekly workshops covering mobile app basics.", deadline: daysFromNow(40) },

  // Green Future Foundation (active)
  { org: "green-future-foundation", title: "Climate Research Scholarship", category: SCHOLARSHIP, type: ONLINE, status: PUBLISHED,
    summary: "Tuition support for students doing climate-related research.", deadline: daysFromNow(45), publishedDaysAgo: 1 },
  { org: "green-future-foundation", title: "Sustainability Policy Internship", category: INTERNSHIP, type: HYBRID, status: PUBLISHED,
    summary: "Support the policy team on sustainability reports and outreach.", deadline: daysFromNow(21), publishedDaysAgo: 6 },
  { org: "green-future-foundation", title: "Green Innovation Challenge", category: COMPETITION, type: ONLINE, status: PUBLISHED,
    summary: "Expired on purpose: published, but the deadline has passed.", deadline: daysFromNow(-5), publishedDaysAgo: 30 },
  { org: "green-future-foundation", title: "Community Garden Volunteer Programme", category: OTHER, type: IN_PERSON, status: ARCHIVED,
    summary: "Archived: should never appear publicly.", publishedDaysAgo: 60 },

  // Campus Robotics Club (active)
  { org: "campus-robotics-club", title: "Robotics Club: Open Membership", category: CLUB, type: IN_PERSON, status: PUBLISHED,
    summary: "General membership is open to all students, no experience needed.", publishedDaysAgo: 3 },
  { org: "campus-robotics-club", title: "Robotics Club: Hardware Lead Wanted", category: CLUB, type: HYBRID, status: PUBLISHED,
    summary: "We are looking for a hardware lead for the upcoming competition season.", deadline: daysFromNow(20), publishedDaysAgo: 4 },
  { org: "campus-robotics-club", title: "Intro to Arduino Night", category: EVENT, type: IN_PERSON, status: PUBLISHED,
    summary: "Hands-on evening introducing Arduino boards and simple circuits.", deadline: daysFromNow(7), publishedDaysAgo: 1 },

  // Pending and suspended organizations (must stay hidden)
  { org: "bright-minds-initiative", title: "Peer Tutoring Scholarship", category: SCHOLARSHIP, type: ONLINE, status: DRAFT,
    summary: "Draft from a pending organization." },
  { org: "quick-cash-scholarships", title: "Guaranteed Scholarship, Apply Now", category: SCHOLARSHIP, type: ONLINE, status: PUBLISHED,
    summary: "Published, but its organization is suspended so it must be hidden.", deadline: daysFromNow(25), publishedDaysAgo: 2 },
];

/* ---------- Seeding ---------- */

const upsertOptions = {
  upsert: true,
  returnDocument: "after",
  setDefaultsOnInsert: true,
} as const;

async function seed() {
  const admin = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    { $set: { name: "Platform Admin", role: UserRole.ADMIN } },
    upsertOptions,
  );

  const orgIds = new Map<string, mongoose.Types.ObjectId>();
  for (const org of organizations) {
    const verified = org.status !== OrganizationStatus.PENDING;
    const doc = await Organization.findOneAndUpdate(
      { slug: org.slug },
      {
        $set: {
          ...org,
          verifiedAt: verified ? new Date() : undefined,
          verifiedBy: verified ? admin._id : undefined,
        },
      },
      upsertOptions,
    );
    orgIds.set(org.slug, doc._id);

    await User.findOneAndUpdate(
      { email: `${org.slug}-member@seed.test` },
      { $set: { name: `${org.name} Member`, role: UserRole.ORG_MEMBER, organizationId: doc._id } },
      upsertOptions,
    );
  }

  for (const { org, publishedDaysAgo, ...opp } of opportunities) {
    await Opportunity.findOneAndUpdate(
      { slug: toSlug(opp.title) },
      {
        $set: {
          ...opp,
          slug: toSlug(opp.title),
          description: `${opp.summary} ${FILLER}`,
          organizationId: orgIds.get(org),
          location: opp.type === ONLINE ? "Online" : "Main Campus",
          applicationUrl: `https://example.com/apply/${toSlug(opp.title)}`,
          additionalLinks: [`https://example.com/${org}`],
          publishedAt:
            opp.status === DRAFT || publishedDaysAgo === undefined
              ? undefined
              : daysFromNow(-publishedDaysAgo),
        },
      },
      upsertOptions,
    );
  }

  const visible = opportunities.filter(
    (o) =>
      o.status === PUBLISHED &&
      organizations.find((org) => org.slug === o.org)?.status === OrganizationStatus.ACTIVE,
  ).length;

  console.log(
    `Seeded 1 admin, ${organizations.length} organizations, ${opportunities.length} opportunities.`,
  );
  console.log(`Expected publicly visible: ${visible} (includes 1 expired listing).`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Check .env.local.");
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed in production.");
  }

  await mongoose.connect(uri);
  console.log(`Seeding database "${mongoose.connection.name}"...`);
  try {
    await seed();
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});