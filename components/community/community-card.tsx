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
      className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 transition hover:bg-white/[0.03] last:border-b-0"
    >
      {showRank ? (
        <span className="w-6 text-center text-[14px] font-bold tabular-nums text-copy-soft">
          {community.trendingRank}
        </span>
      ) : null}

      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{
          background: `linear-gradient(135deg, ${community.coverFrom}, ${community.accentColor})`,
        }}
      >
        {community.avatar}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-bold text-white">
            {community.name}
          </span>
          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-px text-[11px] font-bold text-copy-muted">
            {community.ticker}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-[13px] text-copy-muted">
          {community.tagline}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <div className="text-[13px] tabular-nums text-copy-muted">
          {formatCompactNumber(community.memberCount)}
        </div>
        {community.activeNow > 0 ? (
          <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-copy-soft">
            <span className="inline-block size-1.5 rounded-full bg-accent-tertiary" />
            {community.activeNow} online
          </div>
        ) : null}
      </div>
    </Link>
  );
};
