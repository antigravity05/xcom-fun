import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Screenshot, sourceToVideoX, sourceToVideoY } from "../components/Screenshot";
import { AnimatedCursor } from "../components/AnimatedCursor";
import { ClickEffect } from "../components/ClickEffect";
import { TextLabel } from "../components/TextLabel";
import { frames } from "../utils/constants";
import type { CursorKeyframe } from "../utils/types";

/**
 * Connect X scene - 10 seconds
 *
 * Flow:
 *   0-4s:   Connect X page - cursor clicks "Connect with X" button
 *   4-4.5s: Crossfade to OAuth page
 *   4.5-9s: OAuth page - cursor clicks "Authorize app"
 *   9-10s:  Fade out
 *
 * Source coordinates:
 *   02-connect-page.png:
 *     "Connect with X" button center: x=636, y=375
 *   02-oauth.png:
 *     "Authorize app" button center: x=687, y=564
 *     Account "Anti Gravity @Anti_Gravity00": x=640, y=466
 */
export const ConnectX: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const transitionAt = frames(4);

  // Phase 1: Connect page
  const p1 = interpolate(
    frame,
    [0, 10, transitionAt - 12, transitionAt],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Phase 2: OAuth page
  const p2 = interpolate(
    frame,
    [transitionAt - 5, transitionAt + 8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Button coords
  const connectBtnX = sourceToVideoX(636);
  const connectBtnY = sourceToVideoY(375);
  const authBtnX = sourceToVideoX(687);
  const authBtnY = sourceToVideoY(564);

  // Cursor 1: move to "Connect with X" and click
  const cursor1: CursorKeyframe[] = [
    { frame: frames(0.5), x: connectBtnX, y: connectBtnY - 150 },
    { frame: frames(1.8), x: connectBtnX, y: connectBtnY },
    { frame: frames(2.5), x: connectBtnX, y: connectBtnY, click: true },
  ];

  // Cursor 2: move to "Authorize app" and click
  const cursor2: CursorKeyframe[] = [
    { frame: frames(5), x: authBtnX, y: authBtnY - 200 },
    { frame: frames(6.5), x: authBtnX, y: authBtnY },
    { frame: frames(7.5), x: authBtnX, y: authBtnY, click: true },
  ];

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
      {frame < transitionAt + 12 && (
        <div style={{ opacity: p1, position: "absolute", inset: 0 }}>
          <Screenshot src="screenshots/02-connect-page.png" />
        </div>
      )}

      {frame > transitionAt - 8 && (
        <div style={{ opacity: p2, position: "absolute", inset: 0 }}>
          <Screenshot src="screenshots/02-oauth.png" />
        </div>
      )}

      {frame < transitionAt && <AnimatedCursor keyframes={cursor1} />}
      <ClickEffect x={connectBtnX} y={connectBtnY} triggerFrame={frames(2.5)} />

      {frame >= transitionAt && <AnimatedCursor keyframes={cursor2} />}
      <ClickEffect x={authBtnX} y={authBtnY} triggerFrame={frames(7.5)} />

      <TextLabel
        text="Connect your X account"
        enterFrame={frames(0.3)}
        exitFrame={frames(3.5)}
        size="large"
      />

      <TextLabel
        text="Authorize with one click"
        enterFrame={frames(5)}
        exitFrame={frames(9)}
        size="large"
      />
    </div>
  );
};
