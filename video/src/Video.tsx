import { useVideoConfig, interpolate, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";
import { VideoOverlays } from "./scenes/VideoOverlays";
import { ProgressBar } from "./components/ProgressBar";
import { Vignette } from "./components/Vignette";
import { frames, VIDEO, COLORS } from "./utils/constants";
import { getTotalVideoOverlaysDuration } from "./scenes/VideoOverlays";

const TRANSITION = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: frames(0.5) })}
  />
);

export const Video: React.FC = () => {
  const { durationInFrames, fps } = useVideoConfig();
  const videoDuration = getTotalVideoOverlaysDuration(VIDEO.FPS);

  return (
    <div style={{ width: VIDEO.WIDTH, height: VIDEO.HEIGHT, position: "relative" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={frames(3)}>
          <Intro />
        </TransitionSeries.Sequence>

        {TRANSITION}

        <TransitionSeries.Sequence durationInFrames={videoDuration}>
          <VideoOverlays />
        </TransitionSeries.Sequence>

        {TRANSITION}

        <TransitionSeries.Sequence durationInFrames={frames(4)}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Background music with fade in/out */}
      <Audio
        src={staticFile("music.mp3")}
        volume={(f) => {
          // Fade in over 1.5s
          const fadeIn = interpolate(f, [0, 1.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          // Fade out over last 2s
          const fadeOut = interpolate(
            f,
            [durationInFrames - 2 * fps, durationInFrames],
            [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return Math.min(fadeIn, fadeOut) * 0.18;
        }}
        loop
      />

      {/* Vignette on content area */}
      <Vignette />

      {/* Separator line */}
      <div
        style={{
          position: "absolute",
          top: VIDEO.CONTENT_HEIGHT,
          left: 0,
          width: VIDEO.WIDTH,
          height: 1,
          background: `linear-gradient(90deg, transparent 5%, ${COLORS.LINE_STRONG} 20%, ${COLORS.LINE_STRONG} 80%, transparent 95%)`,
          zIndex: 900,
        }}
      />

      {/* Progress bar */}
      <ProgressBar />
    </div>
  );
};
