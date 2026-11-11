import { OpportunityFilters } from "@/features/opportunities/components/OpportunityFilters";
import { OpportunityGrid } from "@/features/opportunities/components/OpportunityGrid";
import { sampleOpportunities } from "@/features/opportunities/sampleOpportunities";

//type made for filter
type OpportunitiesPageProps = {
  searchParams: Promise<{
    search?: string;
    category?: string;
  }>;
};

export default async function OpportunitiesPage( { searchParams }: OpportunitiesPageProps ) {
  const params = await searchParams;
  const search = params.search?.trim().toLowerCase() ?? "";
  const category = params.category?.trim().toLowerCase() ?? "";

  //change to actual db given opportunities
  const filteredOpportunities = sampleOpportunities.filter((opportunity) => {
    const matchSearch = 
    !search || 
    opportunity.title.toLowerCase().includes(search) ||
    opportunity.organizationName.toLowerCase().includes(search) ||
    opportunity.summary.toLowerCase().includes(search) ||
    opportunity.slug.toLowerCase().includes(search) ||
    opportunity.category.toLowerCase().includes(search);

    const matchCategory = 
    !category ||
    opportunity.category.toLowerCase() === category;

    return matchCategory && matchSearch;
  })

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
      <section aria-label="Opportunity results" className="mt-8">
        <OpportunityGrid opportunities={filteredOpportunities} />
      </section>
    </main>
  );
}
