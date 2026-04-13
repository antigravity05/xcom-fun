import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Screenshot, sourceToVideoX, sourceToVideoY } from "../components/Screenshot";
import { AnimatedCursor } from "../components/AnimatedCursor";
import { ClickEffect } from "../components/ClickEffect";
import { TextLabel } from "../components/TextLabel";
import { frames, COLORS, FONT_FAMILY } from "../utils/constants";
import type { CursorKeyframe } from "../utils/types";

/**
 * View on X scene - 9 seconds
 * Flow: Click timestamp on published post → X.com shows synced post
 *
 * Source coordinates:
 * - Timestamp "2 seconds ago" link: ~x=730, y=283 in 06-post-published.png
 * - X icon on post: ~x=780, y=283
 */
export const ViewOnX: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const transitionAt = frames(3.5);

  const p1Opacity = interpolate(
    frame,
    [0, 10, transitionAt - 10, transitionAt],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const p2Opacity = interpolate(
    frame,
    [transitionAt - 5, transitionAt + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Click on timestamp/X icon
  const linkX = sourceToVideoX(750);
  const linkY = sourceToVideoY(283);

  const cursorKeyframes: CursorKeyframe[] = [
    { frame: frames(0.5), x: linkX + 100, y: linkY - 150 },
    { frame: frames(2), x: linkX, y: linkY, click: true },
  ];

  // Synced badge
  const syncProgress = spring({
    frame: frame - transitionAt - frames(1.5),
    fps,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* XCOM post */}
      {frame < transitionAt + 15 && (
        <div style={{ opacity: p1Opacity, position: "absolute", inset: 0 }}>
          <Screenshot src="screenshots/06-post-published.png" />
          <AnimatedCursor keyframes={cursorKeyframes} />
          <ClickEffect x={linkX} y={linkY} triggerFrame={frames(2)} />
        </div>
      )}

      {/* X.com */}
      {frame > transitionAt - 10 && (
        <div style={{ opacity: p2Opacity, position: "absolute", inset: 0 }}>
          <Screenshot src="screenshots/07-x-synced.png" />

          {syncProgress > 0 && (
            <div
              style={{
                position: "absolute",
                right: 80,
                top: 40,
                opacity: syncProgress,
                transform: `scale(${0.8 + syncProgress * 0.2})`,
                background: `${COLORS.ACCENT_GREEN}20`,
                border: `2px solid ${COLORS.ACCENT_GREEN}`,
                borderRadius: 30,
                padding: "10px 24px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                zIndex: 100,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={COLORS.ACCENT_GREEN}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              <span
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: 22,
                  fontWeight: 700,
                  color: COLORS.ACCENT_GREEN,
                }}
              >
                Synced with X
              </span>
            </div>
          )}
        </div>
      )}

      <TextLabel
        text="Click to view on X"
        enterFrame={frames(0.3)}
        exitFrame={frames(3)}
        size="large"
      />

      <TextLabel
        text="Everything syncs — posts, likes, comments, retweets"
        enterFrame={frames(4.5)}
        exitFrame={frames(8.5)}
        size="large"
      />
    </div>
  );
};
