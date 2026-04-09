import type { Metadata } from "next";
import { LogOut, Shield, Zap } from "lucide-react";
import {
  connectDemoAccountAction,
  disconnectDemoAccountAction,
} from "@/app/xcom-actions";
import { CenterColumnHeader } from "@/components/layout/center-column-header";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { getViewer, listConnectableUsers } from "@/lib/xcom-read-models";
import { hasXOAuthEnvironment } from "@/lib/x/oauth-contract";

export const metadata: Metadata = {
  title: "Connect X",
};

type ConnectXPageProps = {
  searchParams?:
    | Promise<{
        redirectTo?: string;
      }>
    | {
        redirectTo?: string;
      };
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
          ? { displayName: viewer.displayName, xHandle: viewer.xHandle }
          : null
      }
    >
      <div className="grid w-full max-w-[1012px] xl:grid-cols-[minmax(0,1fr)_348px]">
        <div className="min-w-0 border-x border-white/10">
          <CenterColumnHeader
            title="Connect X"
            description={
              hasXOAuth
                ? "Link your X account to join communities and have posts sync directly to your profile."
                : "Pick an account to explore communities, post, and interact."
            }
          />

          {/* Real OAuth flow */}
          {hasXOAuth && !viewer ? (
            <section className="border-b border-white/10 px-4 py-6 sm:px-6">
              <div className="mx-auto max-w-sm text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-secondary/10">
                  <Zap className="size-8 text-accent-secondary" />
                </div>
                <h2 className="mt-4 text-[20px] font-extrabold text-white">
                  Connect your X account
                </h2>
                <p className="mt-2 text-[15px] leading-6 text-copy-muted">
                  We use OAuth 2.0 with PKCE for a secure connection. Your
                  tokens are encrypted at rest.
                </p>
                <a
                  href="/api/auth/x"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-black transition hover:bg-white/90"
                >
                  <span className="text-[18px] font-black">X</span>
                  Connect with X
                </a>
                <div className="mt-4 flex items-center justify-center gap-2 text-[13px] text-copy-soft">
                  <Shield className="size-3.5" />
                  <span>Secure OAuth 2.0 PKCE flow</span>
                </div>
              </div>
            </section>
          ) : null}

          {/* Connected account */}
          {viewer ? (
            <section className="border-b border-white/10 px-4 py-5 sm:px-6">
              <div className="text-[13px] font-bold uppercase tracking-[0.16em] text-copy-muted">
                Connected account
              </div>
              <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-surface-secondary/50 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-secondary/15 text-sm font-bold text-white">
                    {viewer.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold text-white">
                      {viewer.displayName}
                    </div>
                    <div className="mt-0.5 truncate text-[14px] text-copy-muted">
                      {viewer.xHandle}
                    </div>
                  </div>
                </div>
                <form action={disconnectDemoAccountAction}>
                  <input type="hidden" name="redirectTo" value="/connect-x" />
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[13px] font-bold text-copy-muted transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <LogOut className="size-3.5" />
                    Disconnect
                  </button>
                </form>
              </div>
            </section>
          ) : null}

          {/* Account picker (fallback when OAuth is not configured) */}
          {!hasXOAuth && (
            <section className="border-b border-white/10">
              <div className="signal-divider px-4 py-4 text-[13px] font-bold uppercase tracking-[0.16em] text-copy-muted sm:px-6">
                Choose an account
              </div>
              <div>
                {connectableUsers.map((account) => (
                  <form
                    key={account.id}
                    action={connectDemoAccountAction}
                    className="signal-divider flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-white/[0.02] last:border-b-0 sm:px-6"
                  >
                    <input type="hidden" name="userId" value={account.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-sm font-bold text-white">
                        {account.displayName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-bold text-white">
                          {account.displayName}
                        </div>
                        <div className="mt-0.5 truncate text-[14px] text-copy-muted">
                          {account.xHandle}
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="shrink-0 rounded-full bg-white px-5 py-2 text-[14px] font-bold text-black transition hover:bg-white/90"
                    >
                      Connect
                    </button>
                  </form>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="hidden xl:block" />
      </div>
    </XcomChrome>
  );
}
