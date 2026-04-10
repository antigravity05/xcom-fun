"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { updateCommunityAction } from "@/app/communities/actions";

type EditCommunityFormProps = {
  communitySlug: string;
  initialName: string;
  initialDescription: string;
  currentBannerUrl?: string | null;
  initialContractAddress?: string | null;
};

export const EditCommunityForm = ({
  communitySlug,
  initialName,
  initialDescription,
  currentBannerUrl,
  initialContractAddress,
}: EditCommunityFormProps) => {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    currentBannerUrl ?? null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      const result = await updateCommunityAction(formData);

      if (!result.ok) {
        setServerMessage(result.error);
        return;
      }

      router.push(`/communities/${result.slug}?tab=about`);
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
      <input type="hidden" name="communitySlug" value={communitySlug} />

      <div className="px-4 py-5 sm:px-6">
        <p className="text-[15px] leading-6 text-copy-muted">
          Update your community details. Changes are reflected immediately.
        </p>
      </div>

      <div className="space-y-0">
        <div className="signal-divider px-4 py-4 sm:px-6">
          <Field
            label="Name"
            input={
              <input
                name="name"
                defaultValue={initialName}
                required
                className="signal-focus w-full rounded-2xl border border-white/10 bg-surface-secondary/50 px-4 py-3 text-[15px] text-white placeholder:text-copy-soft"
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
                rows={5}
                defaultValue={initialDescription}
                required
                className="signal-focus w-full rounded-2xl border border-white/10 bg-surface-secondary/50 px-4 py-3 text-[15px] leading-6 text-white placeholder:text-copy-soft"
              />
            }
          />
        </div>

        <div className="signal-divider px-4 py-4 sm:px-6">
          <Field
            label="Contract Address"
            hint="Optional"
            input={
              <input
                name="contractAddress"
                defaultValue={initialContractAddress ?? ""}
                placeholder="0x..."
                className="signal-focus w-full rounded-2xl border border-white/10 bg-surface-secondary/50 px-4 py-3 font-mono text-[15px] text-white placeholder:text-copy-soft"
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
              <span className="text-[12px] text-copy-soft">
                PNG, JPG, WEBP or GIF, max 5 MB
              </span>
            </div>

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
                  <span className="text-[13px] font-medium">
                    Click to upload a new banner
                  </span>
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
                Saving...
              </>
            ) : (
              "Save changes"
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
