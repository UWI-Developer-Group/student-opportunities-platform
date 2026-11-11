import Image from "next/image";
import Link from "next/link";

export type OpportunityCardData = {
  title: string;
  slug: string;
  summary: string;
  category: string;
  organizationName: string;
  imageUrl: string;
};

export function OpportunityCard({
  opportunity,
}: {
  opportunity: OpportunityCardData;
}) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-green-200 via-green-300 to-green-200 h-24 flex justify-center items-center">
        {opportunity.imageUrl && 
          <Image 
            src={opportunity.imageUrl}
            alt="opportunity image"
            className="w-full h-20 rounded-t-xl"
          ></Image>
        }
      </div>
      <span className="p-6 pt-3 pb-3">
        <h2 className="mt-3 text-xl font-semibold text-slate-950">
        <Link
          className="hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href={`/opportunities/${encodeURIComponent(opportunity.slug)}`}
        >
          {opportunity.title}
        </Link>
      </h2>
      <p className="text-sm font-medium text-emerald-800">
        {opportunity.category}
      </p>
      <p className="mt-auto pt-5 text-sm font-medium text-slate-700">
        {opportunity.organizationName}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {opportunity.summary}
      </p>
      </span>
      
    </article>
  );
}
