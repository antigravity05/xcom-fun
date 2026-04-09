import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { joinCommunityAction, leaveCommunityAction } from "@/app/xcom-actions";
import type {
  CommunityRecord,
  CommunityTab,
  MembershipStatus,
} from "@/lib/xcom-domain";
import { communityTabs } from "@/lib/xcom-domain";
import {
  formatCompactNumber,
  shortenContractAddress,
} from "@/lib/xcom-formatters";

type CommunityHeaderProps = {
  community: CommunityRecord;
  activeTab: CommunityTab;
  hasViewer: boolean;
  viewerMembershipStatus: MembershipStatus | null;
  canLeaveCommunity: boolean;
};

export const CommunityHeader = ({
  community,
  activeTab,
  hasViewer,
  viewerMembershipStatus,
  canLeaveCommunity,
}: CommunityHeaderProps) => {
  return (
    <section className="border-b border-white/10">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 flex min-h-[53px] items-center gap-4 border-b border-white/10 bg-background/80 px-4 py-2.5 backdrop-blur sm:px-6">
        <Link
          href="/"
          className="inline-flex size-9 items-center justify-center rounded-full text-white transition hover:bg-white/[0.06]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[17px] font-extrabold text-white">
              {community.name}
            </span>
            {community.createdBy.verified ? (
              <BadgeCheck className="size-[18px] shrink-0 fill-accent-secondary text-background" />
            ) : null}
          </div>
          <div className="truncate text-[13px] text-copy-muted">
            {formatCompactNumber(community.memberCount)} members
          </div>
        </div>
      </div>

      {/* Banner */}
      <div
        className="relative h-44 sm:h-[200px]"
        style={
          community.bannerUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.25)), url(${community.bannerUrl})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }
            : {
                background: `linear-gradient(135deg, ${community.coverFrom}, ${community.coverTo})`,
              }
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>

      {/* Profile section */}
      <div className="relative px-4 pb-0 sm:px-6">
        {/* Avatar */}
        <div
          className="absolute -top-14 flex size-[88px] items-center justify-center rounded-full border-[4px] border-background text-xl font-bold text-white shadow-lg sm:-top-16 sm:size-[120px] sm:text-2xl"
          style={{
            background: `linear-gradient(135deg, ${community.coverTo}, ${community.accentColor})`,
          }}
        >
          {community.avatar}
        </div>

        {/* Join/Leave button */}
        <div className="flex justify-end pt-3">
          {viewerMembershipStatus === "active" ? (
            canLeaveCommunity ? (
              <form action={leaveCommunityAction}>
                <input type="hidden" name="communitySlug" value={community.slug} />
                <input type="hidden" name="redirectTo" value={`/communities/${community.slug}`} />
                <button
                  type="submit"
                  className="group relative rounded-full border border-white/20 bg-transparent px-5 py-2 text-[14px] font-bold text-white transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
                >
                  <span className="group-hover:hidden">Joined</span>
                  <span className="hidden group-hover:inline">Leave</span>
                </button>
              </form>
            ) : (
              <div className="rounded-full border border-white/20 bg-transparent px-5 py-2 text-[14px] font-bold text-white">
                Joined
              </div>
            )
          ) : viewerMembershipStatus === "pending" ? (
            <div className="rounded-full border border-white/20 px-5 py-2 text-[14px] font-bold text-copy-muted">
              Pending
            </div>
          ) : hasViewer ? (
            <form action={joinCommunityAction}>
              <input type="hidden" name="communitySlug" value={community.slug} />
              <input type="hidden" name="redirectTo" value={`/communities/${community.slug}`} />
              <button
                type="submit"
                className="rounded-full bg-white px-5 py-2 text-[14px] font-bold text-black transition hover:bg-white/90"
              >
                Join
              </button>
            </form>
          ) : (
            <Link
              href={`/connect-x?redirectTo=${encodeURIComponent(`/communities/${community.slug}`)}`}
              className="rounded-full bg-white px-5 py-2 text-[14px] font-bold text-black transition hover:bg-white/90"
            >
              Connect X to Join
            </Link>
          )}
        </div>

        {/* Community info */}
        <div className="mt-5 sm:mt-6">
          <h1 className="text-[23px] font-extrabold leading-7 text-white sm:text-[28px]">
            {community.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[15px]">
            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[13px] font-bold text-copy-muted">
              {community.ticker}
            </span>
            {community.contractAddress ? (
              <span className="text-[13px] text-copy-soft">
                CA: {shortenContractAddress(community.contractAddress)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 max-w-lg text-[15px] leading-5 text-copy-muted">
            {community.tagline}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[15px]">
            <span className="text-copy-muted">
              <span className="font-bold text-white">
                {formatCompactNumber(community.memberCount)}
              </span>{" "}
              members
            </span>
            <span className="text-copy-muted">
              Created by{" "}
              <span className="font-bold text-white">
                {community.createdBy.handle}
              </span>
            </span>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="sticky top-[53px] z-10 mt-4 flex border-t border-white/10 bg-background/92 backdrop-blur">
          {communityTabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <Link
                key={tab.id}
                href={`/communities/${community.slug}?tab=${tab.id}`}
                className={`relative flex flex-1 items-center justify-center px-2 py-[14px] text-[15px] font-medium transition ${
                  isActive
                    ? "text-white"
                    : "text-copy-muted hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                {isActive ? (
                  <span className="absolute bottom-0 h-1 w-14 rounded-full bg-accent-secondary" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
