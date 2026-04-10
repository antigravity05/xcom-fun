import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { joinCommunityAction, leaveCommunityAction } from "@/app/xcom-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
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
    <section>
      {/* Sticky top bar */}
      <div className="sticky top-[53px] z-20 flex min-h-[53px] items-center gap-3 border-b border-white/[0.08] bg-background/80 px-4 backdrop-blur lg:top-0 sm:px-6">
        <Link
          href="/"
          className="inline-flex size-9 items-center justify-center rounded-full text-white transition hover:bg-white/[0.06]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="truncate text-[17px] font-extrabold text-white">
              {community.name}
            </span>
            {community.createdBy.verified ? (
              <BadgeCheck className="size-[18px] shrink-0 fill-accent-secondary text-background" />
            ) : null}
          </div>
          <div className="text-[13px] text-copy-muted">
            {formatCompactNumber(community.memberCount)}{" "}
            {community.memberCount === 1 ? "member" : "members"}
          </div>
        </div>
      </div>

      {/* Banner */}
      <div
        className="relative h-[125px] sm:h-[200px]"
        style={
          community.bannerUrl
            ? {
                backgroundImage: `url(${community.bannerUrl})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }
            : {
                background: `linear-gradient(135deg, ${community.coverFrom}, ${community.coverTo})`,
              }
        }
      />

      {/* Profile section */}
      <div className="border-b border-white/[0.08] px-4 pb-0 sm:px-6">
        {/* Join/Leave button */}
        <div className="flex justify-end pt-3 pb-1">
          {viewerMembershipStatus === "active" ? (
            canLeaveCommunity ? (
              <form action={leaveCommunityAction}>
                <input type="hidden" name="communitySlug" value={community.slug} />
                <input type="hidden" name="redirectTo" value={`/communities/${community.slug}`} />
                <FormSubmitButton
                  className="group rounded-full border border-white/20 px-5 py-1.5 text-[14px] font-bold text-white transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                  pendingChildren="Leaving..."
                >
                  <span className="group-hover:hidden">Joined</span>
                  <span className="hidden group-hover:inline">Leave</span>
                </FormSubmitButton>
              </form>
            ) : (
              <span className="rounded-full border border-white/20 px-5 py-1.5 text-[14px] font-bold text-white">
                Joined
              </span>
            )
          ) : viewerMembershipStatus === "pending" ? (
            <span className="rounded-full border border-white/20 px-5 py-1.5 text-[14px] font-bold text-copy-muted">
              Pending
            </span>
          ) : hasViewer ? (
            <form action={joinCommunityAction}>
              <input type="hidden" name="communitySlug" value={community.slug} />
              <input type="hidden" name="redirectTo" value={`/communities/${community.slug}`} />
              <FormSubmitButton
                className="rounded-full bg-accent-secondary px-5 py-1.5 text-[14px] font-bold text-white transition hover:brightness-110"
                pendingChildren="Joining..."
              >
                Join
              </FormSubmitButton>
            </form>
          ) : (
            <Link
              href={`/connect-x?redirectTo=${encodeURIComponent(`/communities/${community.slug}`)}`}
              className="rounded-full bg-accent-secondary px-5 py-1.5 text-[14px] font-bold text-white transition hover:brightness-110"
            >
              Connect to Join
            </Link>
          )}
        </div>

        {/* Community info */}
        <div className="mt-2 sm:mt-3">
          <h1 className="text-[20px] font-extrabold leading-7 text-white sm:text-[22px]">
            {community.name}
          </h1>
          {community.contractAddress ? (
            <div className="mt-1 text-[12px] text-copy-soft">
              {shortenContractAddress(community.contractAddress)}
            </div>
          ) : null}
          <p className="mt-1.5 max-w-lg text-[15px] leading-5 text-copy-muted">
            {community.tagline}
          </p>
          <div className="mt-2 flex items-center gap-4 text-[14px] text-copy-muted">
            <span>
              <span className="font-bold text-white">
                {formatCompactNumber(community.memberCount)}
              </span>{" "}
              {community.memberCount === 1 ? "member" : "members"}
            </span>
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="mt-3 flex">
          {communityTabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                href={`/communities/${community.slug}?tab=${tab.id}`}
                className={`relative flex flex-1 items-center justify-center py-3 text-[14px] font-medium transition ${
                  isActive
                    ? "text-white"
                    : "text-copy-muted hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                {tab.label}
                {isActive ? (
                  <span className="absolute bottom-0 h-[3px] w-12 rounded-full bg-accent-secondary" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
};
