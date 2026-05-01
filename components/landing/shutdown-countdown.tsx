"use client";

import { useEffect, useState } from "react";
import { X_COMMUNITIES_DEADLINE } from "@/lib/x-communities-deadline";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeTimeLeft(): TimeLeft | null {
  const diff = X_COMMUNITIES_DEADLINE.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const pad = (value: number) => value.toString().padStart(2, "0");

interface UnitProps {
  value: string;
  label: string;
}

const Unit = ({ value, label }: UnitProps) => (
  <div className="flex flex-col items-center">
    <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[40px] font-extrabold leading-none tabular-nums text-white shadow-[0_0_30px_rgba(239,68,68,0.15)] sm:px-5 sm:py-3 sm:text-[64px]">
      {value}
    </div>
    <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300/80 sm:text-[11px]">
      {label}
    </div>
  </div>
);

export function ShutdownCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const next = computeTimeLeft();
      if (next === null) {
        setExpired(true);
      } else {
        setTimeLeft(next);
      }
    };
    const firstTick = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(firstTick);
      clearInterval(interval);
    };
  }, []);

  if (expired) return null;

  if (!timeLeft) {
    return (
      <div className="flex items-center justify-center gap-2 sm:gap-3" aria-hidden>
        <Unit value="--" label="Days" />
        <Unit value="--" label="Hours" />
        <Unit value="--" label="Minutes" />
        <Unit value="--" label="Seconds" />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-3"
      role="timer"
      aria-label="Time remaining until X Communities are deleted"
    >
      <Unit value={pad(timeLeft.days)} label="Days" />
      <Unit value={pad(timeLeft.hours)} label="Hours" />
      <Unit value={pad(timeLeft.minutes)} label="Minutes" />
      <Unit value={pad(timeLeft.seconds)} label="Seconds" />
    </div>
  );
}
