"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Check, X as XIcon, AlertCircle } from "lucide-react";

/* ── Types ── */

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

/* ── Context ── */

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export const useToast = () => useContext(ToastContext);

/* ── Provider ── */

let nextId = 0;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — bottom center, above mobile nav */}
      <div className="fixed bottom-20 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-8">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 rounded-full px-5 py-3 text-[14px] font-medium shadow-lg shadow-black/30 animate-[fade-in_0.2s_ease-out] ${
              t.variant === "success"
                ? "bg-accent-secondary text-white"
                : t.variant === "error"
                  ? "bg-danger-soft text-white"
                  : "bg-surface-secondary text-white border border-white/[0.08]"
            }`}
          >
            {t.variant === "success" ? (
              <Check className="size-4 shrink-0" />
            ) : t.variant === "error" ? (
              <AlertCircle className="size-4 shrink-0" />
            ) : null}
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="ml-1 flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-white/20"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
