import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Screenshot, sourceToVideoX, sourceToVideoY } from "../components/Screenshot";
import { AnimatedCursor } from "../components/AnimatedCursor";
import { ClickEffect } from "../components/ClickEffect";
import { TextLabel } from "../components/TextLabel";
import { frames, COLORS } from "../utils/constants";
import type { CursorKeyframe } from "../utils/types";

/**
 * Interact scene - 15 seconds (3 sub-scenes of 5s each)
 *
 * Uses 06-post-published.png - cursor clicks each interaction button.
 *
 * Source coordinates from 06-post-published.png interaction bar:
 *   Reply (bubble icon + "0"):     x=435, y=790
 *   Retweet (arrows icon + "0"):   x=525, y=790
 *   Like (heart icon + "0"):       x=610, y=790
 *   Views (chart icon + "0"):      x=695, y=790
 */

const replyBtnX = sourceToVideoX(435);
const retweetBtnX = sourceToVideoX(525);
const likeBtnX = sourceToVideoX(610);
const interactBtnY = sourceToVideoY(790);

const ICON_PATHS = {
  heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  comment: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z",
  retweet: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
};

const ClickSubScene: React.FC<{
  btnX: number;
  btnY: number;
  color: string;
  iconPath: string;
}> = ({ btnX, btnY, color, iconPath }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  // Cursor approaches button and clicks
  const cursor: CursorKeyframe[] = [
    { frame: frames(0.3), x: btnX + 120, y: btnY - 180 },
    { frame: frames(1.2), x: btnX, y: btnY },
    { frame: frames(1.8), x: btnX, y: btnY, click: true },
  ];

  // Pop animation after click
  const popFrame = frame - frames(1.8);
  const popScale = popFrame > 0
    ? spring({ frame: popFrame, fps, config: { damping: 8 } })
    : 0;
  const popOpacity = popFrame > 0
    ? interpolate(popFrame, [0, frames(2)], [1, 0], { extrapolateRight: "clamp" })
    : 0;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div style={{ opacity: fadeIn }}>
        <Screenshot src="screenshots/06-post-published.png" />
      </div>

      {popFrame > 0 && popFrame < frames(2.5) && (
        <div
          style={{
            position: "absolute",
            left: btnX,
            top: btnY,
            transform: `translate(-50%, -50%) scale(${popScale * 2.5})`,
            zIndex: 100,
            opacity: popOpacity,
          }}
        >
          <svg width="56" height="56" viewBox="0 0 24 24" fill={color}>
            <path d={iconPath} />
          </svg>
        </div>
      )}

      <AnimatedCursor keyframes={cursor} />
      <ClickEffect x={btnX} y={btnY} triggerFrame={frames(1.8)} color={color} />
    </div>
  );
};

export const Interact: React.FC = () => {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Like: 0-5s */}
      <Sequence from={0} durationInFrames={frames(5)} premountFor={frames(0.5)}>
        <ClickSubScene
          btnX={likeBtnX}
          btnY={interactBtnY}
          color={COLORS.ACCENT_PINK}
          iconPath={ICON_PATHS.heart}
        />
      </Sequence>

      {/* Comment: 5-10s */}
      <Sequence from={frames(5)} durationInFrames={frames(5)} premountFor={frames(0.5)}>
        <ClickSubScene
          btnX={replyBtnX}
          btnY={interactBtnY}
          color={COLORS.ACCENT_BLUE}
          iconPath={ICON_PATHS.comment}
        />
      </Sequence>

      {/* Retweet: 10-15s */}
      <Sequence from={frames(10)} durationInFrames={frames(5)} premountFor={frames(0.5)}>
        <ClickSubScene
          btnX={retweetBtnX}
          btnY={interactBtnY}
          color={COLORS.ACCENT_GREEN}
          iconPath={ICON_PATHS.retweet}
        />
      </Sequence>

      <TextLabel text="Like it" enterFrame={frames(0.3)} exitFrame={frames(4)} size="large" />
      <TextLabel text="Comment on it" enterFrame={frames(5.3)} exitFrame={frames(9)} size="large" />
      <TextLabel text="Retweet it" enterFrame={frames(10.3)} exitFrame={frames(14)} size="large" />
    </div>
  );
};
