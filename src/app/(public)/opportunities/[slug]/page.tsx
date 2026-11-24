import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublicOpportunity } from "@/features/opportunities/service";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const opportunity = await getPublicOpportunity(slug);

  if (!opportunity) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:px-10">
      <Link
        className="font-medium text-emerald-800 underline underline-offset-4"
        href="/opportunities"
      >
        All opportunities
      </Link>
      <div>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {opportunity?.title}
        </h1>
        <Link className="hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 font-semibold" href={`/organizations/${encodeURIComponent(opportunity?.organization.slug)}`}>{opportunity?.organization.name}</Link>
        
        <p className="italic">
          Deadline: {opportunity?.deadline?.toLocaleDateString()}
        </p>
        {opportunity?.imageUrl && 
          <Image
            alt="Image for opportunity"
            fill={true}
            src={opportunity?.imageUrl}
            className="relative mt-6 aspect-video w-full overflow-hidden rounded-xl"
            >
          </Image>
        } 
        <p className="italic">Date Posted: {opportunity.createdAt.toLocaleDateString()}</p>
        <p className="mt-3">
          {opportunity?.description}
        </p>

        
      </div>
    </main>
  );
}
