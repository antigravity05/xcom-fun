import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { joinCommunityAction, leaveCommunityAction } from "@/app/xcom-actions";
import { CopyContractAddress } from "@/components/community/copy-contract-address";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type {
  CommunityRecord,
  CommunityTab,
  MembershipStatus,
} from "@/lib/xcom-domain";
import { communityTabs } from "@/lib/xcom-domain";
import { formatCompactNumber } from "@/lib/xcom-formatters";

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
      {/* Sticky top bar — minimal like X */}
      <div className="sticky top-[53px] z-20 flex min-h-[53px] items-center gap-3 border-b border-white/[0.08] bg-background/80 px-4 backdrop-blur lg:top-0">
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

      {/* Banner — taller on mobile like X */}
      <div
        className="relative h-[150px] sm:h-[200px]"
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
      >
        {/* Join/Leave button overlaid on banner — bottom right like X */}
        <div className="absolute bottom-3 right-4">
          {viewerMembershipStatus === "active" ? (
            canLeaveCommunity ? (
              <form action={leaveCommunityAction}>
                <input type="hidden" name="communitySlug" value={community.slug} />
                <input type="hidden" name="redirectTo" value={`/communities/${community.slug}`} />
                <FormSubmitButton
                  className="group rounded-full border border-white/40 bg-black/60 px-5 py-1.5 text-[14px] font-bold text-white backdrop-blur-sm transition hover:border-red-500/60 hover:bg-red-500/20 hover:text-red-400"
                  pendingChildren="Leaving..."
                >
                  <span className="group-hover:hidden">Joined</span>
                  <span className="hidden group-hover:inline">Leave</span>
                </FormSubmitButton>
              </form>
            ) : (
              <span className="rounded-full border border-white/40 bg-black/60 px-5 py-1.5 text-[14px] font-bold text-white backdrop-blur-sm">
                Joined
              </span>
            )
          ) : viewerMembershipStatus === "pending" ? (
            <span className="rounded-full border border-white/40 bg-black/60 px-5 py-1.5 text-[14px] font-bold text-copy-muted backdrop-blur-sm">
              Pending
            </span>
          ) : hasViewer ? (
            <form action={joinCommunityAction}>
              <input type="hidden" name="communitySlug" value={community.slug} />
              <input type="hidden" name="redirectTo" value={`/communities/${community.slug}`} />
              <FormSubmitButton
                className="rounded-full bg-accent-secondary px-5 py-1.5 text-[14px] font-bold text-white shadow-lg transition hover:brightness-110"
                pendingChildren="Joining..."
              >
                Join
              </FormSubmitButton>
            </form>
          ) : (
            <Link
              href={`/connect-x?redirectTo=${encodeURIComponent(`/communities/${community.slug}`)}`}
              className="rounded-full bg-accent-secondary px-5 py-1.5 text-[14px] font-bold text-white shadow-lg transition hover:brightness-110"
            >
              Connect to Join
            </Link>
          )}
        </div>
      </div>

      {/* Community info — tighter spacing like X */}
      <div className="border-b border-white/[0.08] px-4 pb-0 sm:px-6">
        <div className="mt-3">
          <h1 className="text-[22px] font-extrabold leading-7 text-white sm:text-[24px]">
            {community.name}
          </h1>
          <p className="mt-1 max-w-lg text-[15px] leading-5 text-copy-muted">
            {community.tagline}
          </p>
          {community.contractAddress ? (
            <CopyContractAddress address={community.contractAddress} />
          ) : null}
          <div className="mt-2 flex items-center gap-4 text-[14px]">
            <span className="text-copy-muted">
              <span className="font-bold text-white">
                {formatCompactNumber(community.memberCount)}
              </span>{" "}
              {community.memberCount === 1 ? "member" : "members"}
            </span>
          </div>
        </div>

        {/* Tab navigation — scrollable on mobile like X */}
        <nav className="-mx-4 mt-3 flex overflow-x-auto scrollbar-none sm:mx-0">
          {communityTabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                href={`/communities/${community.slug}?tab=${tab.id}`}
                className={`relative flex min-w-0 flex-1 items-center justify-center whitespace-nowrap px-4 py-3 text-[14px] font-medium transition sm:px-0 ${
                  isActive
                    ? "font-bold text-white"
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
