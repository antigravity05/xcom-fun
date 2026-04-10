"use client";

/**
 * Twitter/X-style circular character counter.
 * Shows a circular progress indicator that fills up as characters are typed.
 * - Blue when under 80%
 * - Yellow when between 80-100%
 * - Red when over limit
 * - Shows remaining count when near limit
 */

type CharacterCounterProps = {
  current: number;
  limit: number;
  /** Size of the circle in pixels (default: 20) */
  size?: number;
};

export const CharacterCounter = ({
  current,
  limit,
  size = 20,
}: CharacterCounterProps) => {
  const ratio = current / limit;
  const isOverLimit = ratio > 1;
  const isWarning = ratio > 0.8;

  // Circle math
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(ratio, 1) * circumference;

  // Color logic matching X's exact behavior
  const strokeColor = isOverLimit
    ? "text-danger-soft"
    : isWarning
      ? "text-yellow-500"
      : "text-accent-secondary";

  const remaining = limit - current;

  return (
    <div className="flex items-center gap-1.5">
      <svg
        className={`-rotate-90 ${size <= 20 ? "size-5" : ""}`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-white/[0.08]"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          className={`transition-all duration-150 ${strokeColor}`}
        />
      </svg>

      {/* Show remaining count when approaching limit */}
      {isWarning ? (
        <span
          className={`text-[13px] tabular-nums ${
            isOverLimit ? "font-bold text-danger-soft" : "text-copy-muted"
          }`}
        >
          {remaining}
        </span>
      ) : null}
    </div>
  );
};
