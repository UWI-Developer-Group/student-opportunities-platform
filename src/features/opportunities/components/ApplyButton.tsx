export function ApplyButton({ href }: { href: string }) {
  return (
    <a
      className="inline-flex min-h-11 items-center rounded-md bg-emerald-700 px-5 py-2.5 font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      Apply on organization website
    </a>
  );
}
