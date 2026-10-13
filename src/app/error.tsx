"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start px-6 py-16 sm:px-10">
      <h1 className="text-2xl font-semibold text-slate-950">
        Something went wrong
      </h1>
      <p className="mt-3 text-slate-600">
        We could not load this page. Please try again.
      </p>
      <button
        className="mt-6 rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800"
        onClick={() => reset()}
        type="button"
      >
        Try again
      </button>
    </main>
  );
}
