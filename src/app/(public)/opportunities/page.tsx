import { OpportunityFilters } from "@/features/opportunities/components/OpportunityFilters";
import { OpportunityGrid } from "@/features/opportunities/components/OpportunityGrid";

export default function OpportunitiesPage() {
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
        <OpportunityGrid opportunities={[]} />
      </section>
    </main>
  );
}
