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

  // Staggered entrance for each part of the logo
  const xProgress = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const comProgress = spring({ frame: frame - 4, fps, config: { damping: 15, stiffness: 120 } });
  const funProgress = spring({ frame: frame - 8, fps, config: { damping: 15, stiffness: 120 } });

  // Tagline fades in after logo
  const taglineProgress = spring({
    frame: frame - Math.round(1 * fps),
    fps,
    config: { damping: 200 },
  });

  // Background glow pulses
  const glowScale = interpolate(frame, [0, 2 * fps], [0.5, 1.2], {
    extrapolateRight: "clamp",
  });
  const glowOpacity = interpolate(frame, [0, 0.5 * fps, 2 * fps], [0, 0.4, 0.15], {
    extrapolateRight: "clamp",
  });

  // Subtle line decoration
  const lineWidth = interpolate(
    spring({ frame: frame - 5, fps, config: { damping: 200 } }),
    [0, 1],
    [0, 300],
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
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.ACCENT_BLUE}35, transparent 70%)`,
          opacity: glowOpacity,
          transform: `scale(${glowScale})`,
        }}
      />

      {/* Logo - staggered entrance */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
        }}
      >
        {/* x */}
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 130,
            fontWeight: 900,
            letterSpacing: -4,
            background: `linear-gradient(135deg, #4FC3F7, ${COLORS.ACCENT_BLUE}, #0D47A1)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            opacity: xProgress,
            transform: `translateY(${interpolate(xProgress, [0, 1], [40, 0])}px)`,
          }}
        >
          x
        </span>
        {/* -com */}
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 130,
            fontWeight: 900,
            letterSpacing: -4,
            color: COLORS.FOREGROUND,
            opacity: comProgress,
            transform: `translateY(${interpolate(comProgress, [0, 1], [40, 0])}px)`,
          }}
        >
          -com
        </span>
        {/* .fun */}
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 130,
            fontWeight: 900,
            letterSpacing: -4,
            color: COLORS.ACCENT_BLUE,
            opacity: funProgress,
            transform: `translateY(${interpolate(funProgress, [0, 1], [40, 0])}px)`,
          }}
        >
          .fun
        </span>
      </div>

      {/* Accent line under logo */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${COLORS.ACCENT_BLUE}, transparent)`,
          marginTop: 12,
        }}
      />

      {/* Tagline */}
      <div
        style={{
          opacity: taglineProgress,
          transform: `translateY(${interpolate(taglineProgress, [0, 1], [20, 0])}px)`,
          marginTop: 20,
        }}
      >
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 28,
            fontWeight: 500,
            color: COLORS.COPY_MUTED,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          X communities, supercharged
        </span>
      </div>
    </div>
  );
};
