import Link from "next/link";
import {
  Compass,
  LogOut,
  PenSquare,
  Zap,
} from "lucide-react";
import { disconnectDemoAccountAction } from "@/app/xcom-actions";
import { Logo } from "@/components/brand/logo";

type NavigationKey = "discover" | "create" | "connect" | "community";

type XcomChromeProps = {
  active: NavigationKey;
  viewer?: {
    displayName: string;
    xHandle: string;
  } | null;
  children: React.ReactNode;
};

export const XcomChrome = ({ active, viewer, children }: XcomChromeProps) => {
  const viewerAvatar = viewer?.displayName.slice(0, 1).toUpperCase() ?? "X";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1360px] justify-center">
        {/* ── Desktop sidebar ── */}
        <aside className="hidden w-[68px] shrink-0 xl:w-[275px] lg:flex lg:justify-end">
          <div className="sticky top-0 flex h-screen w-full max-w-[259px] flex-col items-center px-1 py-3 xl:items-stretch xl:px-3">
            {/* Logo */}
            <Link
              href="/"
              className="mb-6 flex size-[50px] items-center justify-center rounded-full transition hover:bg-white/[0.06] xl:mb-4 xl:ml-1 xl:size-auto xl:justify-start xl:px-3"
            >
              <span className="xl:hidden">
                <Logo variant="icon" height={28} />
              </span>
              <span className="hidden xl:block">
                <Logo variant="full" height={28} />
              </span>
            </Link>

            {/* Nav items */}
            <nav className="flex flex-1 flex-col items-center gap-1 xl:items-stretch">
              <NavItem
                href="/"
                label="Explore"
                icon={Compass}
                isActive={active === "discover" || active === "community"}
              />

              {!viewer ? (
                <NavItem
                  href="/connect-x"
                  label="Connect X"
                  icon={Zap}
                  isActive={active === "connect"}
                />
              ) : null}

              {viewer ? (
                <Link
                  href="/create-community"
                  className="mt-4 flex size-[50px] items-center justify-center rounded-full bg-accent-secondary text-white transition hover:brightness-110 xl:size-auto xl:px-6 xl:py-3.5"
                >
                  <PenSquare className="size-5 xl:hidden" />
                  <span className="hidden text-[17px] font-bold xl:block">
                    New Community
                  </span>
                </Link>
              ) : null}
            </nav>

            {/* User / CTA at bottom */}
            <div className="mt-auto flex flex-col items-center gap-2 py-3 xl:items-stretch">
              {viewer ? (
                <>
                  <Link
                    href="/"
                    className="flex size-10 items-center justify-center rounded-full bg-accent-secondary/15 text-sm font-bold text-white xl:size-auto xl:gap-3 xl:rounded-full xl:px-3 xl:py-3 xl:transition xl:hover:bg-white/[0.06]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-secondary/20 text-sm font-bold text-white xl:size-10">
                      {viewerAvatar}
                    </span>
                    <span className="hidden min-w-0 flex-1 xl:block">
                      <span className="block truncate text-[15px] font-bold leading-5 text-white">
                        {viewer.displayName}
                      </span>
                      <span className="block truncate text-[13px] leading-4 text-copy-muted">
                        {viewer.xHandle}
                      </span>
                    </span>
                  </Link>
                  <form action={disconnectDemoAccountAction} className="w-full">
                    <input type="hidden" name="redirectTo" value="/" />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-[13px] text-copy-soft transition hover:bg-white/[0.06] hover:text-red-400 xl:justify-start"
                    >
                      <LogOut className="size-4" />
                      <span className="hidden xl:inline">Log out</span>
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/connect-x"
                  className="flex size-[50px] items-center justify-center rounded-full bg-accent-secondary text-white transition hover:brightness-110 xl:size-auto xl:px-6 xl:py-3"
                >
                  <Zap className="size-5 xl:hidden" />
                  <span className="hidden text-[15px] font-bold xl:block">
                    Connect X
                  </span>
                </Link>
              )}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* ── Mobile header ── */}
          <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-background/85 backdrop-blur lg:hidden">
            <div className="flex min-h-[53px] items-center justify-between px-4">
              <Link href="/" className="flex items-center">
                <Logo variant="full" height={24} />
              </Link>
              {viewer ? (
                <div className="flex size-8 items-center justify-center rounded-full bg-accent-secondary/20 text-xs font-bold text-white">
                  {viewerAvatar}
                </div>
              ) : (
                <Link
                  href="/connect-x"
                  className="rounded-full bg-accent-secondary px-3.5 py-1.5 text-[13px] font-bold text-white"
                >
                  Connect
                </Link>
              )}
            </div>
          </header>

          {/* ── Mobile bottom nav ── */}
          <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/[0.08] bg-background/95 py-2 backdrop-blur lg:hidden mobile-safe-bottom">
            <MobileNavItem
              href="/"
              label="Explore"
              icon={Compass}
              isActive={active === "discover" || active === "community"}
            />
            {viewer ? (
              <MobileNavItem
                href="/create-community"
                label="Create"
                icon={PenSquare}
                isActive={active === "create"}
              />
            ) : (
              <MobileNavItem
                href="/connect-x"
                label="Connect"
                icon={Zap}
                isActive={active === "connect"}
              />
            )}
          </nav>

          <main className="flex min-h-screen justify-center pb-16 lg:pb-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

/* ── Helpers ── */

const NavItem = ({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
}) => (
  <Link
    href={href}
    aria-current={isActive ? "page" : undefined}
    className={`flex size-[50px] items-center justify-center rounded-full transition xl:size-auto xl:justify-start xl:gap-5 xl:rounded-full xl:px-4 xl:py-3 ${
      isActive
        ? "font-bold text-white"
        : "text-white hover:bg-white/[0.06]"
    }`}
  >
    <Icon
      className={`size-[26px] ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`}
    />
    <span className={`hidden text-[20px] xl:inline ${isActive ? "font-bold" : ""}`}>
      {label}
    </span>
  </Link>
);

const MobileNavItem = ({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
}) => (
  <Link
    href={href}
    className={`flex flex-col items-center gap-0.5 px-6 py-1 ${
      isActive ? "text-white" : "text-copy-muted"
    }`}
  >
    <Icon className={`size-6 ${isActive ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
    <span className="text-[10px] font-medium">{label}</span>
  </Link>
);
