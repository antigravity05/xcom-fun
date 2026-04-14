"use client";

import { useEffect, useRef } from "react";
import { recordPostView } from "@/app/xcom-actions";

const tracked = new Set<string>();

export function PostViewTracker({ postId }: { postId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tracked.has(postId)) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.has(postId)) {
          tracked.add(postId);
          recordPostView(postId);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [postId]);

  return <div ref={ref} className="absolute inset-0 pointer-events-none" />;
}
