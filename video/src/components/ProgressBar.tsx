import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS, VIDEO } from "../utils/constants";

/**
 * Thin progress bar at the bottom of the video.
 * Shows playback progress with a gradient accent.
 */
export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = frame / durationInFrames;
  const width = progress * VIDEO.WIDTH;

  // Fade in at start
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: VIDEO.WIDTH,
        height: 4,
        background: "rgba(255,255,255,0.08)",
        zIndex: 1000,
        opacity,
      }}
    >
      <div
        style={{
          width,
          height: "100%",
          background: `linear-gradient(90deg, ${COLORS.ACCENT_BLUE}, ${COLORS.ACCENT_PINK})`,
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
};
