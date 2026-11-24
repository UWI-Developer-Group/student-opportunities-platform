import { Suspense } from "react";
import { OpportunityFilters } from "@/features/opportunities/components/OpportunityFilters";
import { OpportunityGrid } from "@/features/opportunities/components/OpportunityGrid";
import { listPublicOpportunities } from "@/features/opportunities/service";

// Type made for filters
type OpportunitiesPageProps = {
  searchParams: Promise<{
    search?: string;
    category?: string;
  }>;
};

async function OpportunitiesList({
  searchParams,
}: OpportunitiesPageProps) {
  const params = await searchParams;

  const search = params.search?.trim() ?? "";
  const category = params.category?.trim() ?? "";

  // Retrieve opportunities from MongoDB through the service
  const result = await listPublicOpportunities({
    q: search,
    category: category,
  });

  // Adapt backend data to the structure expected by OpportunityGrid
  const opportunities = result.items.map((opportunity) => ({
    ...opportunity,
    organizationName: opportunity.organization.name,
  }));

  return (
    <OpportunityGrid opportunities={opportunities} />
  );
}

export default function OpportunitiesPage({
  searchParams,
}: OpportunitiesPageProps) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
        Explore
      </p>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        Student opportunities
      </h1>

      <p className="mt-4 max-w-2xl leading-7 text-slate-600">
        Search and filter student-focused listings.
      </p>

      <div className="mt-8">
        <OpportunityFilters />
      </div>

      <section
        aria-label="Opportunity results"
        className="mt-8"
      >
        <Suspense fallback={<p>Loading opportunities...</p>}>
          <OpportunitiesList searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}
