import Link from "next/link";
import {
  OpportunityCard,
  type OpportunityCardData,
} from "@/features/opportunities/components/OpportunityCard";

export function OpportunityGrid({
  opportunities,
}: {
  opportunities: OpportunityCardData[];
}) {
  if (opportunities.length === 0) {
    return (
      <section
        aria-labelledby="empty-opportunities-heading"
        className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"
      >
        <h2
          className="text-lg font-semibold text-slate-900"
          id="empty-opportunities-heading"
        >
          No opportunities to show yet
        </h2>
        <p className="mt-2 text-slate-600">
          Check back soon for new opportunities.
        </p>
        <Link
          className="mt-4 inline-flex font-medium text-emerald-800 underline underline-offset-4"
          href="/"
        >
          Back to home
        </Link>
      </section>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {opportunities.map((opportunity) => (
        <li key={opportunity.slug}>
          <OpportunityCard opportunity={opportunity} />
        </li>
      ))}
    </ul>
  );
}
