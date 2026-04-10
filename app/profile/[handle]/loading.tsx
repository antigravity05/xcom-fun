export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[990px]">
        {/* Header skeleton */}
        <div className="flex min-h-[53px] items-center gap-3 border-b border-white/[0.08] px-4 sm:px-6">
          <div className="skeleton size-9 rounded-full" />
          <div className="skeleton h-5 w-36 rounded" />
        </div>

        {/* Banner skeleton */}
        <div className="skeleton h-[140px] w-full" style={{ borderRadius: 0 }} />

        {/* Avatar + stats skeleton */}
        <div className="border-b border-white/[0.08] px-4 py-4 sm:px-6">
          <div className="flex items-end gap-4">
            <div className="skeleton -mt-10 size-20 rounded-full border-4 border-background" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-6 w-40 rounded" />
              <div className="skeleton h-4 w-24 rounded" />
            </div>
          </div>
          <div className="mt-4 flex gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-4 w-16 rounded" />
            ))}
          </div>
        </div>

        {/* Community badges skeleton */}
        <div className="border-b border-white/[0.08] px-4 py-3 sm:px-6">
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-7 w-24 rounded-full" />
            ))}
          </div>
        </div>

        {/* Posts skeleton */}
        <div className="space-y-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-b border-white/[0.08] px-4 py-4 sm:px-6">
              <div className="flex gap-3">
                <div className="skeleton size-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2.5">
                  <div className="skeleton h-4 w-48 rounded" />
                  <div className="skeleton h-4 w-full rounded" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="mt-3 flex gap-8">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="skeleton h-4 w-10 rounded" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
