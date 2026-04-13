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
    config: { damping: 200 },
  });

  // URL entrance (delayed)
  const urlProgress = spring({
    frame: frame - Math.round(0.5 * fps),
    fps,
    config: { damping: 200 },
  });

  // CTA entrance (delayed more)
  const ctaProgress = spring({
    frame: frame - Math.round(1 * fps),
    fps,
    config: { damping: 200 },
  });

  // Subtle pulse on CTA
  const ctaPulse = interpolate(
    frame % (2 * fps),
    [0, fps, 2 * fps],
    [1, 1.05, 1],
  );

  // Background glow
  const glowOpacity = interpolate(
    frame,
    [0, 1 * fps],
    [0, 0.2],
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
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.ACCENT_PINK}30, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoProgress,
          transform: `scale(${0.8 + logoProgress * 0.2})`,
          display: "flex",
          alignItems: "baseline",
        }}
      >
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 100,
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
            fontSize: 100,
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
            fontSize: 100,
            fontWeight: 900,
            letterSpacing: -4,
            color: COLORS.ACCENT_BLUE,
          }}
        >
          .fun
        </span>
      </div>

      {/* URL */}
      <div
        style={{
          opacity: urlProgress,
          transform: `translateY(${interpolate(urlProgress, [0, 1], [20, 0])}px)`,
          marginTop: 20,
        }}
      >
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 28,
            fontWeight: 500,
            color: COLORS.COPY_MUTED,
          }}
        >
          x-com.fun
        </span>
      </div>

      {/* CTA */}
      <div
        style={{
          opacity: ctaProgress,
          transform: `translateY(${interpolate(ctaProgress, [0, 1], [20, 0])}px) scale(${ctaPulse})`,
          marginTop: 40,
        }}
      >
        <div
          style={{
            background: COLORS.ACCENT_PINK,
            borderRadius: 50,
            padding: "16px 48px",
          }}
        >
          <span
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 24,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            Join your community today
          </span>
        </div>
      </div>
    </div>
  );
};
