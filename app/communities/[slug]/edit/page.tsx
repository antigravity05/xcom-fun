import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditCommunityForm } from "@/components/forms/edit-community-form";
import { CenterColumnHeader } from "@/components/layout/center-column-header";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { getCommunityTimelineView } from "@/lib/xcom-read-models";

type EditCommunityPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: EditCommunityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const view = await getCommunityTimelineView(slug);

  if (!view) {
    return {
      title: "Edit community",
    };
  }

  return {
    title: `Edit ${view.community.name}`,
  };
}

export default async function EditCommunityPage({
  params,
}: EditCommunityPageProps) {
  const { slug } = await params;
  const view = await getCommunityTimelineView(slug);

  if (!view || view.viewerRole !== "admin") {
    notFound();
  }

  return (
    <XcomChrome
      active="community"
      viewer={
        view.viewer
          ? {
              displayName: view.viewer.displayName,
              xHandle: view.viewer.xHandle,
              avatar: view.viewer.avatar,
            }
          : null
      }
    >
      <div className="grid w-full max-w-[990px] xl:grid-cols-[600px_350px]">
        <div className="min-w-0 lg:border-x border-white/10">
          <CenterColumnHeader
            title="Edit community"
            description="Keep the community details accurate before the design pass."
          />

          <EditCommunityForm
            communitySlug={view.community.slug}
            initialName={view.community.name}
            initialDescription={view.community.description}
            currentBannerUrl={view.community.bannerUrl}
            initialContractAddress={view.community.contractAddress}
          />
        </div>

        <aside className="hidden xl:block" />
      </div>
    </XcomChrome>
  );
}
