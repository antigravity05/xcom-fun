import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { Screenshot, sourceToVideoX, sourceToVideoY } from "../components/Screenshot";
import { AnimatedCursor } from "../components/AnimatedCursor";
import { ClickEffect } from "../components/ClickEffect";
import { TextLabel } from "../components/TextLabel";
import { frames } from "../utils/constants";
import type { CursorKeyframe } from "../utils/types";

/**
 * Create Community scene - 10 seconds
 *
 * Flow:
 *   0-3s:   Explore page (logged in) - cursor clicks "New Community" button
 *   3-5s:   Empty form appears
 *   5-8s:   Filled form (crossfade - simulates typing)
 *   8-10s:  Cursor clicks "Create community" button
 *
 * Source coordinates:
 *   03-explore-loggedin.png:
 *     "New Community" button: center ~x=157, y=258
 *   04-create-empty.png:
 *     Name field: x=637, y=290
 *     Description field: x=637, y=401
 *     Banner upload area center: x=637, y=560
 *   04-create-filled.png:
 *     "Create community" button: x=449, y=711
 */
export const CreateCommunity: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const exploreEnd = frames(3);
  const emptyEnd = frames(5);

  // Explore page
  const p1 = interpolate(frame, [0, 10, exploreEnd - 10, exploreEnd], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Empty form
  const p2 = interpolate(frame, [exploreEnd - 5, exploreEnd + 5, emptyEnd - 8, emptyEnd], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Filled form
  const p3 = interpolate(frame, [emptyEnd - 5, emptyEnd + 5], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Button/field coords
  const newComBtnX = sourceToVideoX(157);
  const newComBtnY = sourceToVideoY(258);

  const nameFieldX = sourceToVideoX(637);
  const nameFieldY = sourceToVideoY(290);
  const descFieldY = sourceToVideoY(401);
  const bannerCenterY = sourceToVideoY(560);

  const createBtnX = sourceToVideoX(449);
  const createBtnY = sourceToVideoY(711);

  // Cursor 1: click "New Community" in sidebar
  const cursor1: CursorKeyframe[] = [
    { frame: frames(0.5), x: newComBtnX + 100, y: newComBtnY - 100 },
    { frame: frames(1.5), x: newComBtnX, y: newComBtnY },
    { frame: frames(2), x: newComBtnX, y: newComBtnY, click: true },
  ];

  // Cursor 2: click name field on empty form
  const cursor2: CursorKeyframe[] = [
    { frame: frames(3.5), x: nameFieldX - 100, y: nameFieldY - 80 },
    { frame: frames(4.2), x: nameFieldX, y: nameFieldY, click: true },
  ];

  // Cursor 3: on filled form, click "Create community"
  const cursor3: CursorKeyframe[] = [
    { frame: frames(6), x: nameFieldX, y: descFieldY },
    { frame: frames(7), x: nameFieldX, y: bannerCenterY },
    { frame: frames(8.5), x: createBtnX, y: createBtnY },
    { frame: frames(9), x: createBtnX, y: createBtnY, click: true },
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
      {frame < exploreEnd + 8 && (
        <div style={{ opacity: p1, position: "absolute", inset: 0 }}>
          <Screenshot src="screenshots/03-explore-loggedin.png" />
        </div>
      )}

      {frame > exploreEnd - 8 && frame < emptyEnd + 8 && (
        <div style={{ opacity: p2, position: "absolute", inset: 0 }}>
          <Screenshot src="screenshots/04-create-empty.png" />
        </div>
      )}

      {frame > emptyEnd - 8 && (
        <div style={{ opacity: p3, position: "absolute", inset: 0 }}>
          <Screenshot src="screenshots/04-create-filled.png" />
        </div>
      )}

      {frame < exploreEnd && <AnimatedCursor keyframes={cursor1} />}
      {frame >= exploreEnd && frame < emptyEnd && <AnimatedCursor keyframes={cursor2} />}
      {frame >= emptyEnd && <AnimatedCursor keyframes={cursor3} />}

      <ClickEffect x={newComBtnX} y={newComBtnY} triggerFrame={frames(2)} />
      <ClickEffect x={nameFieldX} y={nameFieldY} triggerFrame={frames(4.2)} />
      <ClickEffect x={createBtnX} y={createBtnY} triggerFrame={frames(9)} />

      <TextLabel
        text="Click New Community"
        enterFrame={frames(0.3)}
        exitFrame={frames(2.8)}
        size="large"
      />

      <TextLabel
        text="Name, description, banner"
        enterFrame={frames(3.5)}
        exitFrame={frames(7.5)}
        size="large"
      />

      <TextLabel
        text="Create!"
        enterFrame={frames(8)}
        exitFrame={frames(9.8)}
        size="large"
      />
    </div>
  );
};
