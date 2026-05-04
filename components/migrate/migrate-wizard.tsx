"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { CreateCommunityForm } from "@/components/forms/create-community-form";

type WizardStep = "form" | "install" | "go";

interface CreatedCommunity {
  slug: string;
  name: string;
}

interface IssuedToken {
  token: string;
  expiresAt: string;
}

interface MigrateWizardProps {
  viewer: {
    displayName: string;
    xHandle: string;
  };
}

const EXTENSION_ZIP_URL = "/xcom-fun-importer.zip";

export function MigrateWizard({ viewer }: MigrateWizardProps) {
  const [step, setStep] = useState<WizardStep>("form");
  const [community, setCommunity] = useState<CreatedCommunity | null>(null);
  const [issuedToken, setIssuedToken] = useState<IssuedToken | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [extensionStatus, setExtensionStatus] = useState<
    "unknown" | "ready" | "token-saved"
  >("unknown");
  const [tokenCopied, setTokenCopied] = useState(false);
  const tokenForwardedRef = useRef(false);

  // Listen for extension presence + ack messages
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.source !== "xcom-fun-extension") return;
      if (data.type === "READY" || data.type === "PONG") {
        setExtensionStatus((current) =>
          current === "token-saved" ? current : "ready",
        );
      } else if (data.type === "IMPORT_TOKEN_ACK") {
        setExtensionStatus("token-saved");
      }
    };
    window.addEventListener("message", handler);
    // Ping in case the extension was already loaded before this listener
    window.postMessage(
      { source: "xcom-fun", type: "PING_EXTENSION" },
      window.location.origin,
    );
    return () => window.removeEventListener("message", handler);
  }, []);

  // When token is issued, forward it to the extension via postMessage.
  // The extension's bridge content script picks it up and stores it.
  useEffect(() => {
    if (!issuedToken || tokenForwardedRef.current) return;
    tokenForwardedRef.current = true;
    window.postMessage(
      {
        source: "xcom-fun",
        type: "IMPORT_TOKEN",
        token: issuedToken.token,
        communityId: community?.slug,
      },
      window.location.origin,
    );
  }, [issuedToken, community?.slug]);

  const handleCommunityCreated = async (created: CreatedCommunity) => {
    setCommunity(created);
    setIssueError(null);
    try {
      const response = await fetch("/api/import/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communitySlug: created.slug }),
      });
      const data = await response.json();
      if (!data?.ok) {
        setIssueError(data?.error || "Failed to issue import token.");
        return;
      }
      setIssuedToken({ token: data.token, expiresAt: data.expiresAt });
      setStep("install");
    } catch (err) {
      setIssueError(
        err instanceof Error ? err.message : "Failed to issue import token.",
      );
    }
  };

  const copyToken = async () => {
    if (!issuedToken) return;
    try {
      await navigator.clipboard.writeText(issuedToken.token);
      setTokenCopied(true);
      window.setTimeout(() => setTokenCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6">
      <Stepper currentStep={step} />

      {step === "form" ? (
        <Section
          n={1}
          title="Tell us about your community"
          subtitle="Pick a name, write a one-paragraph description, and add a banner. You can change all of this later."
        >
          <CreateCommunityForm
            onSuccess={handleCommunityCreated}
            submitLabel="Create & continue →"
            pendingLabel="Creating community…"
          />
          {issueError ? (
            <p className="mt-3 px-4 text-[13px] text-danger-soft sm:px-6">
              {issueError}
            </p>
          ) : null}
        </Section>
      ) : null}

      {step === "install" ? (
        <Section
          n={2}
          title="Install the importer"
          subtitle={`Hey ${viewer.xHandle.startsWith("@") ? viewer.xHandle : "@" + viewer.xHandle}, install our small Chrome extension. It scrolls your X community for you and copies the tweets here.`}
        >
          <div className="space-y-4">
            <ExtensionStatusBanner status={extensionStatus} />

            <ol className="space-y-3 rounded-2xl border border-white/10 bg-surface-secondary/40 p-5 text-[14px] leading-6 text-copy-muted">
              <li>
                <span className="font-bold text-white">1.</span> Download the
                extension zip:{" "}
                <a
                  href={EXTENSION_ZIP_URL}
                  download="xcom-fun-importer.zip"
                  className="inline-flex items-center gap-1 text-accent-secondary hover:underline"
                >
                  <Download className="size-3.5" />
                  xcom-fun-importer.zip
                </a>
              </li>
              <li>
                <span className="font-bold text-white">2.</span> Unzip it
                somewhere you can find later.
              </li>
              <li>
                <span className="font-bold text-white">3.</span> Open{" "}
                <code className="rounded bg-black/40 px-1.5 py-0.5 text-[12px]">
                  chrome://extensions
                </code>
                , toggle <em>Developer mode</em> (top right), then click{" "}
                <em>Load unpacked</em> and select the unzipped folder.
              </li>
              <li>
                <span className="font-bold text-white">4.</span> Refresh this
                page so the extension can pick up your import token. The banner
                above will switch to{" "}
                <span className="text-accent-secondary">Token saved</span>.
              </li>
            </ol>

            {issuedToken ? (
              <details className="rounded-2xl border border-white/[0.06] bg-black/30 p-4">
                <summary className="cursor-pointer text-[12px] uppercase tracking-[0.16em] text-copy-soft">
                  Manual fallback — copy token
                </summary>
                <p className="mt-3 text-[12px] leading-5 text-copy-muted">
                  If the extension doesn&apos;t auto-detect the token, copy it
                  here and paste it inside the extension popup.
                </p>
                <div className="mt-3 flex gap-2">
                  <code className="flex-1 truncate rounded-xl bg-black/40 px-3 py-2 font-mono text-[12px] text-copy-muted">
                    {issuedToken.token}
                  </code>
                  <button
                    type="button"
                    onClick={copyToken}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-[12px] font-bold text-white transition hover:bg-white/[0.04]"
                  >
                    {tokenCopied ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {tokenCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              </details>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep("go")}
                className="inline-flex items-center gap-2 rounded-full bg-accent-secondary px-6 py-2.5 text-[15px] font-bold text-white transition hover:brightness-110"
              >
                I&apos;ve installed it — next
                <ArrowRight className="size-4" />
              </button>
              {community ? (
                <Link
                  href={`/communities/${community.slug}`}
                  className="text-[13px] text-copy-soft hover:text-white"
                >
                  Skip for now → go to my community
                </Link>
              ) : null}
            </div>
          </div>
        </Section>
      ) : null}

      {step === "go" ? (
        <Section
          n={3}
          title="Run the import on X"
          subtitle="Open your X community, click the importer icon, then Start auto-import. Leave the tab open — it scrolls slowly to look human."
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-surface-secondary/40 p-5 text-[14px] leading-6 text-copy-muted">
              <ol className="space-y-2.5">
                <li>
                  <span className="font-bold text-white">1.</span> Open your X
                  community in a new tab (
                  <code className="rounded bg-black/40 px-1.5 py-0.5 text-[12px]">
                    x.com/i/communities/…
                  </code>
                  ).
                </li>
                <li>
                  <span className="font-bold text-white">2.</span> Click the
                  importer icon in your toolbar. The token should already be
                  set if step 2 worked.
                </li>
                <li>
                  <span className="font-bold text-white">3.</span> Click{" "}
                  <em>Start auto-import</em>. Watch the counters tick up. You
                  can close the popup; the import keeps running in the X tab.
                </li>
              </ol>
            </div>

            {community ? (
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://x.com/i/communities/explore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-accent-secondary px-6 py-2.5 text-[15px] font-bold text-white transition hover:brightness-110"
                >
                  Open X
                  <ExternalLink className="size-4" />
                </a>
                <Link
                  href={`/communities/${community.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-2.5 text-[15px] font-bold text-white transition hover:bg-white/[0.04]"
                >
                  Go to my new community
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: WizardStep }) {
  const steps: Array<{ id: WizardStep; label: string }> = [
    { id: "form", label: "Create" },
    { id: "install", label: "Install" },
    { id: "go", label: "Import" },
  ];
  const currentIdx = steps.findIndex((s) => s.id === currentStep);
  return (
    <ol className="mb-8 flex items-center gap-2 text-[12px]">
      {steps.map((step, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={[
                "flex size-6 items-center justify-center rounded-full text-[11px] font-extrabold",
                isDone
                  ? "bg-accent-secondary text-white"
                  : isCurrent
                    ? "bg-accent-secondary/15 text-accent-secondary ring-2 ring-accent-secondary/40"
                    : "bg-white/[0.06] text-copy-soft",
              ].join(" ")}
            >
              {isDone ? <Check className="size-3" /> : i + 1}
            </span>
            <span
              className={[
                "uppercase tracking-[0.18em]",
                isCurrent ? "text-white font-bold" : "text-copy-soft",
              ].join(" ")}
            >
              {step.label}
            </span>
            {i < steps.length - 1 ? (
              <span className="ml-1 h-px w-6 bg-white/[0.08] sm:w-12" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Section({
  n,
  title,
  subtitle,
  children,
}: {
  n: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-copy-soft">
          Step {n}
        </p>
        <h2 className="mt-1 text-[22px] font-extrabold text-white sm:text-[26px]">
          {title}
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-copy-muted">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function ExtensionStatusBanner({
  status,
}: {
  status: "unknown" | "ready" | "token-saved";
}) {
  if (status === "token-saved") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-accent-secondary/40 bg-accent-secondary/10 px-4 py-2.5 text-[13px] text-accent-secondary">
        <Check className="size-4" />
        <span>
          Extension detected and import token saved. You&apos;re ready to import.
        </span>
      </div>
    );
  }
  if (status === "ready") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-[13px] text-blue-300">
        <Loader2 className="size-4 animate-spin" />
        <span>Extension detected. Waiting for token save…</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[13px] text-copy-muted">
      <Loader2 className="size-4 animate-spin" />
      <span>Extension not detected yet. Install it, then refresh this page.</span>
    </div>
  );
}
