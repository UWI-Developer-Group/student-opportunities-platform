import Link from "next/link";

export function PublicNavbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between px-6 sm:px-10"
      >
        <Link className="font-semibold tracking-tight text-slate-950" href="/">
          Student Opportunities
        </Link>
        <Link
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
          href="/opportunities"
        >
          Browse Opportunities
        </Link>
      </nav>
    </header>
  );
}
