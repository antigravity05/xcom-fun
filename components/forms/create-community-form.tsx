"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { isXCommunitiesShutdownActive } from "@/lib/x-communities-deadline";

export const CreateCommunityForm = () => {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMigrating = isXCommunitiesShutdownActive();

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setBannerPreview(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setServerMessage("Banner must be under 5 MB.");
      e.target.value = "";
      return;
    }
    setServerMessage(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBannerPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerMessage(null);
    setIsPending(true);

    try {
      const formData = new FormData(e.currentTarget);

      const response = await fetch("/api/communities/create", {
        method: "POST",
        body: formData,
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        setServerMessage(
          `Server returned ${response.status}: ${text.slice(0, 300)}`,
        );
        return;
      }

      if (!result.ok) {
        setServerMessage(result.error);
        return;
      }

      router.push(`/communities/${result.slug}`);
      router.refresh();
    } catch (err) {
      setServerMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-b border-white/10">
      <div className="px-4 py-5 sm:px-6">
        <p className="text-[15px] leading-6 text-copy-muted">
          {isMigrating
            ? "Move your X community here before May 6. Add a name, description, and banner — you can always update these later."
            : "Launch your community in seconds. Give it a name and description — you can always update these later."}
        </p>
      </div>

      <div className="space-y-0">
        <div className="signal-divider px-4 py-4 sm:px-6">
          <Field
            label="Community name"
            input={
              <input
                name="name"
                required
                className="signal-focus w-full rounded-2xl border border-white/10 bg-surface-secondary/50 px-4 py-3 text-[15px] text-white placeholder:text-copy-soft"
                placeholder="e.g. PEPE Community"
              />
            }
          />
        </div>

        <div className="signal-divider px-4 py-4 sm:px-6">
          <Field
            label="Description"
            input={
              <textarea
                name="description"
                rows={3}
                required
                className="signal-focus w-full rounded-2xl border border-white/10 bg-surface-secondary/50 px-4 py-3 text-[15px] leading-6 text-white placeholder:text-copy-soft"
                placeholder="What is this community about? What brings people together here?"
              />
            }
          />
        </div>

        <div className="signal-divider px-4 py-4 sm:px-6">
          <div className="grid gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-bold uppercase tracking-[0.16em] text-copy-muted">
                Banner
              </span>
              <span className="text-[12px] text-copy-soft">PNG, JPG, WEBP or GIF, max 5 MB</span>
            </div>

            {/* Banner preview / upload zone */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="signal-focus group relative flex h-36 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-surface-secondary/50 transition hover:border-accent-secondary/50 hover:bg-surface-secondary/80"
            >
              {bannerPreview ? (
                <>
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition group-hover:opacity-100" />
                  <span className="relative z-10 rounded-full bg-black/60 px-4 py-2 text-[13px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                    Change image
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-copy-soft transition group-hover:text-accent-secondary">
                  <ImagePlus className="size-8 stroke-[1.5]" />
                  <span className="text-[13px] font-medium">Click to upload banner</span>
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              name="banner"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleBannerChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-5">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-accent-secondary px-6 py-2.5 text-[15px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isMigrating ? "Migrating..." : "Creating..."}
              </>
            ) : isMigrating ? (
              "Migrate my community"
            ) : (
              "Create community"
            )}
          </button>
          {serverMessage ? (
            <p className="text-[14px] leading-5 text-danger-soft">
              {serverMessage}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
};

type FieldProps = {
  label: string;
  hint?: string;
  input: React.ReactNode;
};

const Field = ({ label, hint, input }: FieldProps) => {
  return (
    <label className="grid gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-bold uppercase tracking-[0.16em] text-copy-muted">
          {label}
        </span>
        {hint ? (
          <span className="text-[12px] text-copy-soft">{hint}</span>
        ) : null}
      </div>
      {input}
    </label>
  );
};
