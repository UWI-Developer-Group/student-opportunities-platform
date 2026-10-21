import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-20 sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
        Student Opportunities
      </p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
        Find what comes next.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
        Discover internships, scholarships, events, and other opportunities
        created with students in mind.
      </p>
      <div className="mt-9">
        <Link
          className="inline-flex min-h-11 items-center rounded-md bg-emerald-700 px-5 py-2.5 font-medium text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/opportunities"
        >
          Browse opportunities
        </Link>
      </div>
    </main>
  );
}
