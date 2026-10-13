import Link from "next/link";

export type OpportunityCardData = {
  title: string;
  slug: string;
  summary: string;
  category: string;
  organizationName: string;
};

export function OpportunityCard({
  opportunity,
}: {
  opportunity: OpportunityCardData;
}) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-emerald-800">
        {opportunity.category}
      </p>
      <h2 className="mt-3 text-xl font-semibold text-slate-950">
        <Link
          className="hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href={`/opportunities/${encodeURIComponent(opportunity.slug)}`}
        >
          {opportunity.title}
        </Link>
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {opportunity.summary}
      </p>
      <p className="mt-auto pt-5 text-sm font-medium text-slate-700">
        {opportunity.organizationName}
      </p>
    </article>
  );
}
