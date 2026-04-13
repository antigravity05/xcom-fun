import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, VIDEO } from "../utils/constants";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "800"],
  subsets: ["latin"],
});

type TextLabelProps = {
  text: string;
  enterFrame: number;
  exitFrame: number;
  size?: "small" | "medium" | "large" | "hero";
  accent?: string;
};

const SIZE_MAP = {
  small: 28,
  medium: 34,
  large: 42,
  hero: 52,
};

export const TextLabel: React.FC<TextLabelProps> = ({
  text,
  enterFrame,
  exitFrame,
  size = "large",
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < enterFrame - 5 || frame > exitFrame + 5) return null;

  const enterProgress = spring({
    frame: frame - enterFrame,
    fps,
    config: { damping: 200 },
  });

  const exitProgress = interpolate(
    frame,
    [exitFrame - 8, exitFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const opacity = Math.min(enterProgress, exitProgress);
  const translateY = interpolate(enterProgress, [0, 1], [10, 0]);
  const fontSize = SIZE_MAP[size];

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: VIDEO.WIDTH,
        height: VIDEO.BANNER_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 900,
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {accent && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: accent,
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            color: "#fff",
            fontFamily,
            fontSize,
            fontWeight: 700,
            letterSpacing: -0.5,
            textShadow: "0 2px 16px rgba(0,0,0,0.6)",
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
