import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="panel-shell max-w-xl rounded-[32px] p-8 text-center sm:p-12">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-secondary/10">
          <Compass className="size-7 text-accent-secondary" />
        </div>
        <h1 className="mt-6 text-[28px] font-extrabold tracking-tight text-white sm:text-[32px]">
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-6 text-copy-muted">
          This community or page doesn't exist. It may have been removed, or the link might be wrong.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-black transition hover:bg-white/90"
        >
          Explore communities
        </Link>
      </div>
    </div>
  );
}
