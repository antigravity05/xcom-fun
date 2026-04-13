import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, FONT_FAMILY } from "../utils/constants";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo scale entrance
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Logo opacity
  const logoOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Tagline entrance (delayed)
  const taglineProgress = spring({
    frame: frame - Math.round(0.8 * fps),
    fps,
    config: { damping: 200 },
  });
  const taglineY = interpolate(taglineProgress, [0, 1], [30, 0]);

  // Subtle glow pulse
  const glowOpacity = interpolate(
    frame,
    [0, 1 * fps, 2 * fps],
    [0, 0.3, 0.15],
    { extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: COLORS.BACKGROUND,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.ACCENT_BLUE}40, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* Logo text */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${0.8 + logoScale * 0.2})`,
          display: "flex",
          alignItems: "baseline",
        }}
      >
        {/* x */}
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: -4,
            background: `linear-gradient(135deg, #4FC3F7, ${COLORS.ACCENT_BLUE}, #0D47A1)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          x
        </span>
        {/* -com */}
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: -4,
            color: COLORS.FOREGROUND,
          }}
        >
          -com
        </span>
        {/* .fun */}
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: -4,
            color: COLORS.ACCENT_BLUE,
          }}
        >
          .fun
        </span>
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: taglineProgress,
          transform: `translateY(${taglineY}px)`,
          marginTop: 24,
        }}
      >
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 32,
            fontWeight: 500,
            color: COLORS.COPY_MUTED,
            letterSpacing: 2,
          }}
        >
          X communities, supercharged
        </span>
      </div>
    </div>
  );
};
