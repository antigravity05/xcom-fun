import Link from "next/link";
import type { CommunityRecord } from "@/lib/xcom-domain";
import { formatCompactNumber } from "@/lib/xcom-formatters";

type CommunityCardProps = {
  community: CommunityRecord;
  showRank?: boolean;
};

export const CommunityCard = ({
  community,
  showRank = false,
}: CommunityCardProps) => {
  return (
    <Link
      href={`/communities/${community.slug}`}
      className="group flex items-start gap-3 px-4 py-3.5 transition hover:bg-white/[0.03]"
    >
      {showRank ? (
        <div className="w-8 pt-1 text-center text-[14px] font-bold text-copy-soft">
          {community.trendingRank}
        </div>
      ) : null}

      <div
        className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
        style={{
          background: `linear-gradient(135deg, ${community.coverFrom}, ${community.accentColor})`,
        }}
      >
        {community.avatar}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-copy-soft">
          {showRank ? "Trending in Communities" : "Community"}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          <div className="truncate text-[15px] font-bold text-white">
            {community.name}
          </div>
          <div className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-bold text-copy-muted">
            {community.ticker}
          </div>
        </div>
        <div className="mt-1 line-clamp-2 text-[13px] leading-4 text-copy-muted">
          {community.tagline}
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-[13px] text-copy-soft">
          <span>{formatCompactNumber(community.memberCount)} members</span>
          {community.activeNow > 0 ? (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-1.5 rounded-full bg-accent-tertiary" />
                {community.activeNow} active
              </span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
};
