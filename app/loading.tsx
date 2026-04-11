export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[990px]">
        {/* Search bar skeleton */}
        <div className="border-b border-white/[0.08] px-4 py-2.5">
          <div className="skeleton h-[42px] w-full rounded-full" />
        </div>

        {/* Trending section skeleton */}
        <div className="border-b border-white/[0.08]">
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="skeleton size-4 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 last:border-b-0"
            >
              <div className="skeleton size-12 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-36 rounded" />
                <div className="skeleton h-3 w-48 rounded" />
              </div>
              <div className="skeleton h-3 w-16 rounded" />
            </div>
          ))}
        </div>

        {/* All communities skeleton */}
        <div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="skeleton h-3 w-28 rounded" />
            <div className="skeleton h-3 w-6 rounded" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5"
            >
              <div className="skeleton size-12 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-3 w-56 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
