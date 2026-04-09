import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <div className="text-[64px] font-black text-white/10">404</div>
        <h1 className="mt-2 text-[20px] font-extrabold text-white">
          Page not found
        </h1>
        <p className="mt-2 text-[14px] leading-5 text-copy-muted">
          This page doesn't exist or has been removed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-accent-secondary px-5 py-2.5 text-[14px] font-bold text-white transition hover:brightness-110"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
