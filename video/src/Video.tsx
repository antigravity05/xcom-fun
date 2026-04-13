import { useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";
import { VideoOverlays } from "./scenes/VideoOverlays";
import { ProgressBar } from "./components/ProgressBar";
import { frames, VIDEO } from "./utils/constants";
import { getTotalVideoOverlaysDuration } from "./scenes/VideoOverlays";

const TRANSITION = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: frames(0.5) })}
  />
);

export const Video: React.FC = () => {
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

      {/* Global progress bar */}
      <ProgressBar />
    </div>
  );
};
