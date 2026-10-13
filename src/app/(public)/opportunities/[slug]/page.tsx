import Link from "next/link";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:px-10">
      <Link
        className="font-medium text-emerald-800 underline underline-offset-4"
        href="/opportunities"
      >
        All opportunities
      </Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        Opportunity details
      </h1>
      <p className="mt-3 text-slate-600">
        Opportunity data for <span className="font-medium">{slug}</span> will be
        shown here.
      </p>
      <p className="mt-6 rounded-lg bg-slate-100 p-4 text-sm leading-6 text-slate-600">
        This page is ready for the public opportunity query and external
        application link.
      </p>
    </main>
  );
}
