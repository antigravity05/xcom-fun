import type { Metadata } from "next";
import { LogOut, Shield, Zap } from "lucide-react";
import {
  connectDemoAccountAction,
  disconnectDemoAccountAction,
} from "@/app/xcom-actions";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { getViewer, listConnectableUsers } from "@/lib/xcom-read-models";
import { hasXOAuthEnvironment } from "@/lib/x/oauth-contract";

export const metadata: Metadata = {
  title: "Connect X",
};

type ConnectXPageProps = {
  searchParams?: Promise<{ redirectTo?: string }>;
};

export default async function ConnectXPage({
  searchParams,
}: ConnectXPageProps) {
  const viewer = await getViewer();
  const connectableUsers = await listConnectableUsers();
  const resolvedSearchParams = await searchParams;
  const redirectTo = resolvedSearchParams?.redirectTo || "/";
  const hasXOAuth = hasXOAuthEnvironment();

  return (
    <XcomChrome
      active="connect"
      viewer={
        viewer
          ? { displayName: viewer.displayName, xHandle: viewer.xHandle, avatar: viewer.avatar }
          : null
      }
    >
      <div className="grid w-full max-w-[990px] xl:grid-cols-[600px_350px]">
        <div className="min-w-0 border-x border-white/[0.08]">
          {/* Header */}
          <div className="sticky top-[53px] z-20 flex min-h-[53px] items-center border-b border-white/[0.08] bg-background/85 px-4 backdrop-blur lg:top-0 sm:px-6">
            <h1 className="text-[20px] font-extrabold text-white">
              Connect X
            </h1>
          </div>

          {/* Connected state */}
          {viewer ? (
            <div className="px-4 py-6 sm:px-6">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-secondary/60 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-secondary/15 text-sm font-bold text-white">
                    {viewer.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold text-white">
                      {viewer.displayName}
                    </div>
                    <div className="truncate text-[13px] text-copy-muted">
                      {viewer.xHandle}
                    </div>
                  </div>
                </div>
                <form action={disconnectDemoAccountAction}>
                  <input type="hidden" name="redirectTo" value="/connect-x" />
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-full border border-white/[0.08] px-4 py-1.5 text-[13px] font-bold text-copy-muted transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <LogOut className="size-3.5" />
                    Disconnect
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          {/* OAuth flow */}
          {hasXOAuth && !viewer ? (
            <div className="px-4 py-12 sm:px-6">
              <div className="mx-auto max-w-sm text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent-secondary/10">
                  <Zap className="size-7 text-accent-secondary" />
                </div>
                <h2 className="mt-4 text-[20px] font-extrabold text-white">
                  Connect your X account
                </h2>
                <p className="mt-2 text-[14px] leading-5 text-copy-muted">
                  Secure OAuth 2.0 with PKCE. Your tokens are encrypted at rest.
                </p>
                <a
                  href="/api/auth/x"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent-secondary px-6 py-3 text-[15px] font-bold text-white transition hover:brightness-110"
                >
                  <span className="text-[18px] font-black">𝕏</span>
                  Connect with X
                </a>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-copy-soft">
                  <Shield className="size-3" />
                  OAuth 2.0 PKCE
                </div>
              </div>
            </div>
          ) : null}

          {/* Account picker — demo mode */}
          {!hasXOAuth && !viewer ? (
            <div>
              <div className="px-4 py-3 text-[13px] text-copy-muted sm:px-6">
                Pick an account to get started.
              </div>
              {connectableUsers.map((account) => (
                <form
                  key={account.id}
                  action={connectDemoAccountAction}
                  className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3.5 transition hover:bg-white/[0.02] last:border-b-0 sm:px-6"
                >
                  <input type="hidden" name="userId" value={account.id} />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-sm font-bold text-white">
                      {account.displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-bold text-white">
                        {account.displayName}
                      </div>
                      <div className="truncate text-[13px] text-copy-muted">
                        {account.xHandle}
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="shrink-0 rounded-full bg-accent-secondary px-4 py-1.5 text-[14px] font-bold text-white transition hover:brightness-110"
                  >
                    Connect
                  </button>
                </form>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="hidden xl:block" />
      </div>
    </XcomChrome>
  );
}
