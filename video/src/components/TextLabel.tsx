import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONT_FAMILY } from "../utils/constants";

type TextLabelProps = {
  text: string;
  enterFrame: number;
  exitFrame: number;
  /** Position: "bottom" (default), "top", "center" */
  position?: "bottom" | "top" | "center";
  size?: "small" | "medium" | "large" | "hero";
  /** Optional accent color for a left border */
  accent?: string;
};

const SIZE_MAP = {
  small: { fontSize: 18, padding: "8px 18px" },
  medium: { fontSize: 24, padding: "10px 22px" },
  large: { fontSize: 32, padding: "14px 28px" },
  hero: { fontSize: 44, padding: "18px 36px" },
};

const POSITION_MAP = {
  bottom: { x: 960, y: 940 },
  top: { x: 960, y: 80 },
  center: { x: 960, y: 500 },
};

export const TextLabel: React.FC<TextLabelProps> = ({
  text,
  enterFrame,
  exitFrame,
  position = "bottom",
  size = "large",
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < enterFrame - 5 || frame > exitFrame + 5) return null;

  // Entrance: spring slide-up + fade
  const enterProgress = spring({
    frame: frame - enterFrame,
    fps,
    config: { damping: 200 },
  });

  // Exit: quick fade out
  const exitProgress = interpolate(
    frame,
    [exitFrame - 8, exitFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const opacity = Math.min(enterProgress, exitProgress);
  const translateY = interpolate(enterProgress, [0, 1], [15, 0]);

  const { fontSize, padding } = SIZE_MAP[size];
  const { x, y } = POSITION_MAP[position];

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, ${translateY}px)`,
        opacity,
        zIndex: 900,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(16px)",
          borderRadius: 10,
          padding,
          borderLeft: accent ? `3px solid ${accent}` : undefined,
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontFamily: FONT_FAMILY,
            fontSize,
            fontWeight: 700,
            letterSpacing: -0.5,
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
