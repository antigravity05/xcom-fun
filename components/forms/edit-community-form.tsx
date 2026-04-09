"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCommunityAction } from "@/app/xcom-actions";

type EditCommunityFormProps = {
  communitySlug: string;
  initialName: string;
  initialDescription: string;
};

export const EditCommunityForm = ({
  communitySlug,
  initialName,
  initialDescription,
}: EditCommunityFormProps) => {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    setServerMessage(null);

    startTransition(async () => {
      const result = await updateCommunityAction(formData);

      if (!result.ok) {
        setServerMessage(result.error);
        return;
      }

      router.push(`/communities/${result.slug}?tab=about`);
      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="border-b border-white/10">
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
            label="Replace banner"
            hint="Optional. PNG, JPG, WEBP or GIF, max 5 MB"
            input={
              <input
                type="file"
                name="banner"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="block w-full rounded-2xl border border-white/10 bg-surface-secondary/50 px-4 py-3 text-[14px] text-copy-muted file:mr-4 file:rounded-full file:border-0 file:bg-accent-secondary file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-white hover:file:brightness-110"
              />
            }
          />
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-5">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-accent-secondary px-6 py-2.5 text-[15px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save changes"}
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
