import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { Screenshot, sourceToVideoX, sourceToVideoY } from "../components/Screenshot";
import { AnimatedCursor } from "../components/AnimatedCursor";
import { ClickEffect } from "../components/ClickEffect";
import { TextLabel } from "../components/TextLabel";
import { frames } from "../utils/constants";
import type { CursorKeyframe } from "../utils/types";

/**
 * Post Tweet scene - 10 seconds
 *
 * Flow:
 *   0-2.5s:  Empty community - cursor clicks on composer "What's happening?"
 *   2.5-6s:  Compose view - text "test" typed, polar bear image attached
 *   6-10s:   Cursor clicks "Post" button → published post appears
 *
 * Source coordinates:
 *   05-community-empty.png:
 *     "What's happening?" text: x=470, y=517
 *     Image icon: x=427, y=591
 *     Post button: x=868, y=591
 *   06-compose-post.png:
 *     Text area with "test": x=650, y=337
 *     Image icon: x=427, y=717
 *     Post button: x=868, y=717
 *   06-post-published.png:
 *     Post by "Anti Gravity ADMIN": visible after publishing
 */
export const PostTweet: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const emptyEnd = frames(2.5);
  const composeEnd = frames(6.5);

  const p1 = interpolate(frame, [0, 10, emptyEnd - 10, emptyEnd], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const p2 = interpolate(frame, [emptyEnd - 5, emptyEnd + 5, composeEnd - 10, composeEnd], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const p3 = interpolate(frame, [composeEnd - 5, composeEnd + 5], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Exact button positions
  const composerX = sourceToVideoX(470);
  const composerY = sourceToVideoY(517);

  const composePostBtnX = sourceToVideoX(868);
  const composePostBtnY = sourceToVideoY(717);
  const composeImgIconX = sourceToVideoX(427);
  const composeImgIconY = sourceToVideoY(717);

  // Cursor 1: click on "What's happening?" composer
  const cursor1: CursorKeyframe[] = [
    { frame: frames(0.3), x: composerX + 200, y: composerY - 100 },
    { frame: frames(1.2), x: composerX, y: composerY },
    { frame: frames(1.5), x: composerX, y: composerY, click: true },
  ];

  // Cursor 2: in compose view, click image icon then Post button
  const cursor2: CursorKeyframe[] = [
    { frame: frames(3), x: sourceToVideoX(600), y: sourceToVideoY(400) },
    { frame: frames(3.8), x: composeImgIconX, y: composeImgIconY },
    { frame: frames(4.2), x: composeImgIconX, y: composeImgIconY, click: true },
    { frame: frames(5.2), x: composePostBtnX, y: composePostBtnY },
    { frame: frames(5.8), x: composePostBtnX, y: composePostBtnY, click: true },
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
      {frame < emptyEnd + 8 && (
        <div style={{ opacity: p1, position: "absolute", inset: 0 }}>
          <Screenshot src="screenshots/05-community-empty.png" />
        </div>
      )}

      {frame > emptyEnd - 8 && frame < composeEnd + 8 && (
        <div style={{ opacity: p2, position: "absolute", inset: 0 }}>
          <Screenshot src="screenshots/06-compose-post.png" />
        </div>
      )}

      {frame > composeEnd - 8 && (
        <div style={{ opacity: p3, position: "absolute", inset: 0 }}>
          <Screenshot src="screenshots/06-post-published.png" />
        </div>
      )}

      {frame < emptyEnd && <AnimatedCursor keyframes={cursor1} />}
      {frame >= emptyEnd && frame < composeEnd && <AnimatedCursor keyframes={cursor2} />}

      <ClickEffect x={composerX} y={composerY} triggerFrame={frames(1.5)} />
      <ClickEffect x={composeImgIconX} y={composeImgIconY} triggerFrame={frames(4.2)} />
      <ClickEffect x={composePostBtnX} y={composePostBtnY} triggerFrame={frames(5.8)} />

      <TextLabel
        text="Write your post"
        enterFrame={frames(0.3)}
        exitFrame={frames(2.2)}
        size="large"
      />

      <TextLabel
        text="Add a photo and post"
        enterFrame={frames(3)}
        exitFrame={frames(6)}
        size="large"
      />

      <TextLabel
        text="Published — synced to X instantly"
        enterFrame={frames(7)}
        exitFrame={frames(9.5)}
        size="large"
      />
    </div>
  );
};
