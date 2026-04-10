"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

type FormSubmitButtonProps = {
  children: ReactNode;
  pendingChildren?: ReactNode;
  className?: string;
  pendingClassName?: string;
};

/**
 * Drop-in replacement for <button type="submit"> inside forms.
 * Automatically disables while the parent form is submitting,
 * preventing double-clicks and showing a loading state.
 */
export function FormSubmitButton({
  children,
  pendingChildren,
  className = "",
  pendingClassName,
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={pending ? (pendingClassName ?? `${className} opacity-50 cursor-not-allowed`) : className}
    >
      {pending ? (pendingChildren ?? children) : children}
    </button>
  );
}
