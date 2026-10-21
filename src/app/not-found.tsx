import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start px-6 py-16 sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
        404
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-950">
        Page not found
      </h1>
      <p className="mt-3 text-slate-600">
        The page you are looking for may have moved or is no longer available.
      </p>
      <Link
        className="mt-6 font-medium text-emerald-800 underline underline-offset-4"
        href="/"
      >
        Return home
      </Link>
    </main>
  );
}
