import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="panel-shell max-w-xl rounded-[32px] p-8 text-center">
        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-copy-soft">
          Community not found
        </div>
        <h1 className="font-display mt-4 text-4xl font-bold tracking-tight text-white">
          This room does not exist yet
        </h1>
        <p className="mt-4 text-sm leading-7 text-copy-muted">
          Try one of the seeded communities first, then we can wire persistence and live
          creation on top of the same route contract.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full border border-accent-primary/35 bg-accent-primary/10 px-5 py-3 text-sm font-semibold text-white"
        >
          Back to discover
        </Link>
      </div>
    </div>
  );
}
