import Link from "next/link";
import {
  Compass,
  LogOut,
  PlusCircle,
  Zap,
} from "lucide-react";
import { disconnectDemoAccountAction } from "@/app/xcom-actions";

type NavigationKey = "discover" | "create" | "connect" | "community";

type XcomChromeProps = {
  active: NavigationKey;
  viewer?: {
    displayName: string;
    xHandle: string;
  } | null;
  children: React.ReactNode;
};

const navigationItems = [
  {
    id: "discover",
    href: "/",
    label: "Explore",
    icon: Compass,
  },
  {
    id: "create",
    href: "/create-community",
    label: "Create",
    icon: PlusCircle,
    requiresViewer: true,
  },
] as const;

export const XcomChrome = ({ active, viewer, children }: XcomChromeProps) => {
  const viewerAvatar = viewer?.displayName.slice(0, 1).toUpperCase() ?? "X";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1360px] justify-center">
        {/* Desktop sidebar */}
        <aside className="hidden w-[275px] shrink-0 lg:flex lg:justify-end">
          <div className="sticky top-0 flex h-screen w-full max-w-[259px] flex-col px-2 py-2">
            <Link
              href="/"
              className="mb-4 ml-1 inline-flex size-[50px] items-center justify-center rounded-full transition hover:bg-white/[0.06]"
            >
              <span className="text-[28px] font-black tracking-tighter text-white">
                X
              </span>
            </Link>

            <nav className="flex flex-1 flex-col gap-1 pt-0.5">
              {navigationItems.map((item) => {
                if ("requiresViewer" in item && item.requiresViewer && !viewer) {
                  return null;
                }

                const Icon = item.icon;
                const isActive = active === item.id;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex w-fit items-center gap-5 rounded-full px-4 py-3 text-[20px] leading-6 text-white transition ${
                      isActive
                        ? "font-bold"
                        : "font-normal hover:bg-white/[0.06]"
                    }`}
                  >
                    <Icon className={`size-[26px] ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {!viewer ? (
                <Link
                  href="/connect-x"
                  aria-current={active === "connect" ? "page" : undefined}
                  className={`inline-flex w-fit items-center gap-5 rounded-full px-4 py-3 text-[20px] leading-6 text-white transition ${
                    active === "connect"
                      ? "font-bold"
                      : "font-normal hover:bg-white/[0.06]"
                  }`}
                >
                  <Zap className={`size-[26px] ${active === "connect" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                  <span>Connect X</span>
                </Link>
              ) : null}

              {viewer ? (
                <Link
                  href="/create-community"
                  className="mt-4 flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-[17px] font-bold text-black transition hover:bg-white/90"
                >
                  + New Community
                </Link>
              ) : null}
            </nav>

            <div className="mt-auto px-1 py-3">
              {viewer ? (
                <div className="space-y-1">
                  <div className="flex w-full items-center gap-3 rounded-full px-3 py-3 transition hover:bg-white/[0.06]">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-secondary/20 text-sm font-bold text-white">
                      {viewerAvatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-bold leading-5 text-white">
                        {viewer.displayName}
                      </div>
                      <div className="truncate text-[13px] leading-4 text-copy-muted">
                        {viewer.xHandle}
                      </div>
                    </div>
                    <span className="text-copy-muted">···</span>
                  </div>

                  <form action={disconnectDemoAccountAction}>
                    <input type="hidden" name="redirectTo" value="/" />
                    <button
                      type="submit"
                      className="inline-flex w-full items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium text-copy-muted transition hover:bg-white/[0.06] hover:text-red-400"
                    >
                      <LogOut className="size-4" />
                      Disconnect
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/connect-x"
                  className="inline-flex w-full items-center justify-center rounded-full bg-accent-secondary px-4 py-3 text-[15px] font-bold text-white transition hover:brightness-110"
                >
                  Connect X
                </Link>
              )}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile header */}
          <header className="sticky top-0 z-30 border-b border-white/10 bg-background/85 backdrop-blur lg:hidden">
            <div className="flex min-h-[53px] items-center justify-between px-4 py-2.5">
              <Link
                href="/"
                className="text-[24px] font-black tracking-tighter text-white"
              >
                X
              </Link>
              {viewer ? (
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-copy-muted">
                    {viewer.xHandle}
                  </span>
                  <div className="flex size-8 items-center justify-center rounded-full bg-accent-secondary/20 text-xs font-bold text-white">
                    {viewerAvatar}
                  </div>
                </div>
              ) : (
                <Link
                  href="/connect-x"
                  className="rounded-full bg-white px-3.5 py-1.5 text-[13px] font-bold text-black transition hover:bg-white/90"
                >
                  Connect X
                </Link>
              )}
            </div>
          </header>

          {/* Mobile bottom nav */}
          <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/10 bg-background/90 py-2 backdrop-blur lg:hidden">
            <Link
              href="/"
              className={`flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 ${
                active === "discover" || active === "community"
                  ? "text-white"
                  : "text-copy-muted"
              }`}
            >
              <Compass
                className={`size-6 ${
                  active === "discover" || active === "community"
                    ? "stroke-[2.5]"
                    : "stroke-[1.5]"
                }`}
              />
              <span className="text-[10px] font-medium">Explore</span>
            </Link>

            {viewer ? (
              <Link
                href="/create-community"
                className={`flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 ${
                  active === "create" ? "text-white" : "text-copy-muted"
                }`}
              >
                <PlusCircle
                  className={`size-6 ${active === "create" ? "stroke-[2.5]" : "stroke-[1.5]"}`}
                />
                <span className="text-[10px] font-medium">Create</span>
              </Link>
            ) : null}

            {!viewer ? (
              <Link
                href="/connect-x"
                className={`flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 ${
                  active === "connect" ? "text-white" : "text-copy-muted"
                }`}
              >
                <Zap
                  className={`size-6 ${active === "connect" ? "stroke-[2.5]" : "stroke-[1.5]"}`}
                />
                <span className="text-[10px] font-medium">Connect</span>
              </Link>
            ) : null}
          </nav>

          <main className="flex min-h-screen justify-center pb-16 lg:pb-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
