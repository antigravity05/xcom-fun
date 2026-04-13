import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { ScrollingPage, getMaxScroll } from "../components/ScrollingPage";
import { AnimatedCursor } from "../components/AnimatedCursor";
import { ClickEffect } from "../components/ClickEffect";
import { TextLabel } from "../components/TextLabel";
import { sourceToVideoX, sourceToVideoY } from "../components/Screenshot";
import { frames } from "../utils/constants";
import type { CursorKeyframe } from "../utils/types";

const SCREENSHOTS = [
  "screenshots/01-landing-hero.png",
  "screenshots/01-landing-features.png",
  "screenshots/01-landing-trending.png",
  "screenshots/01-landing-cta.png",
];

/**
 * Landing Page scene - 12 seconds
 * Smooth continuous scroll through the landing page.
 *
 * Timeline:
 *   0-2s:  Pause on hero, user sees the big headline
 *   2-4s:  Cursor moves to "Connect your X account" button and clicks it
 *         (but in the video narrative, we don't navigate yet - just show the click)
 *   4-9s:  Smooth scroll down through features, communities
 *   9-12s: Arrive at bottom CTA "Get started — it's free"
 *
 * Source coordinates (from 01-landing-hero.png):
 *   "Connect your X account" button: center ~x=700, y=433
 *   "Explore communities" button: center ~x=955, y=432
 */
export const LandingPage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in
  const opacity = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Smooth scroll with easing - starts after the hero pause
  const maxScroll = getMaxScroll(SCREENSHOTS.length, 200);
  const scrollY = interpolate(
    frame,
    [
      0,           // start: top of page
      3 * fps,     // still at top (hero visible, cursor clicking)
      4 * fps,     // begin scroll
      9 * fps,     // scrolling through content
      11 * fps,    // arrive at bottom
      12 * fps,    // stay at bottom
    ],
    [0, 0, 0, maxScroll * 0.7, maxScroll, maxScroll],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // "Connect your X account" button position (source coords → video coords)
  // This button is visible on the first screenshot (hero)
  const connectBtnX = sourceToVideoX(700);
  const connectBtnY = sourceToVideoY(433);

  // Cursor: enters screen, clicks "Connect your X account"
  const cursorKeyframes: CursorKeyframe[] = [
    { frame: frames(0.5), x: connectBtnX + 300, y: connectBtnY - 200 },
    { frame: frames(1.5), x: connectBtnX + 50, y: connectBtnY - 20 },
    { frame: frames(2.2), x: connectBtnX, y: connectBtnY, click: true },
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
      <div style={{ opacity }}>
        <ScrollingPage
          screenshots={SCREENSHOTS}
          scrollY={scrollY}
          overlapPx={200}
        />
      </div>

      {/* Cursor only visible during hero section (before scroll) */}
      {frame < frames(3.5) && (
        <AnimatedCursor keyframes={cursorKeyframes} />
      )}
      <ClickEffect x={connectBtnX} y={connectBtnY} triggerFrame={frames(2.2)} />

      <TextLabel
        text="X communities are back"
        enterFrame={frames(0.3)}
        exitFrame={frames(2)}
        size="large"
      />

      <TextLabel
        text="Post once here, it tweets for you"
        enterFrame={frames(5)}
        exitFrame={frames(7.5)}
      />

      <TextLabel
        text="Explore communities"
        enterFrame={frames(8)}
        exitFrame={frames(10)}
      />
    </div>
  );
};
