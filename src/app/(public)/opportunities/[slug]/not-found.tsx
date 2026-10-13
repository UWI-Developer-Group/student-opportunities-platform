import Link from "next/link";

export default function OpportunityNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:px-10">
      <h1 className="text-3xl font-semibold text-slate-950">
        Opportunity not found
      </h1>
      <p className="mt-3 text-slate-600">
        This opportunity may have expired or is no longer publicly available.
      </p>
      <Link
        className="mt-6 inline-flex font-medium text-emerald-800 underline underline-offset-4"
        href="/opportunities"
      >
        Browse opportunities
      </Link>
    </main>
  );
}
