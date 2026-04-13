import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, FONT_FAMILY } from "../utils/constants";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance
  const logoProgress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  // URL
  const urlProgress = spring({
    frame: frame - Math.round(0.4 * fps),
    fps,
    config: { damping: 200 },
  });

  // CTA
  const ctaProgress = spring({
    frame: frame - Math.round(0.8 * fps),
    fps,
    config: { damping: 200 },
  });

  // Background dual glow
  const glowOpacity = interpolate(frame, [0, 0.5 * fps], [0, 0.25], {
    extrapolateRight: "clamp",
  });

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
      {/* Dual background glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.ACCENT_BLUE}30, transparent 70%)`,
          opacity: glowOpacity,
          left: "30%",
          top: "20%",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.ACCENT_PINK}25, transparent 70%)`,
          opacity: glowOpacity,
          right: "25%",
          bottom: "15%",
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoProgress,
          transform: `scale(${0.85 + logoProgress * 0.15})`,
          display: "flex",
          alignItems: "baseline",
        }}
      >
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 110,
            fontWeight: 900,
            letterSpacing: -4,
            background: `linear-gradient(135deg, #4FC3F7, ${COLORS.ACCENT_BLUE}, #0D47A1)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          x
        </span>
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 110,
            fontWeight: 900,
            letterSpacing: -4,
            color: COLORS.FOREGROUND,
          }}
        >
          -com
        </span>
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 110,
            fontWeight: 900,
            letterSpacing: -4,
            color: COLORS.ACCENT_BLUE,
          }}
        >
          .fun
        </span>
      </div>

      {/* URL + tagline */}
      <div
        style={{
          opacity: urlProgress,
          transform: `translateY(${interpolate(urlProgress, [0, 1], [15, 0])}px)`,
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 22,
            fontWeight: 500,
            color: COLORS.COPY_MUTED,
            letterSpacing: 2,
          }}
        >
          The home for crypto communities
        </span>
      </div>

      {/* CTA */}
      <div
        style={{
          opacity: ctaProgress,
          transform: `translateY(${interpolate(ctaProgress, [0, 1], [15, 0])}px)`,
          marginTop: 32,
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${COLORS.ACCENT_BLUE}, ${COLORS.ACCENT_PINK})`,
            borderRadius: 50,
            padding: "14px 44px",
          }}
        >
          <span
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 22,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: 1,
            }}
          >
            Start for free — x-com.fun
          </span>
        </div>
      </div>
    </div>
  );
};
