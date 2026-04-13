import { Sequence, useVideoConfig } from "remotion";
import { Video as RemotionVideo } from "@remotion/media";
import { staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";
import { VideoOverlays } from "./scenes/VideoOverlays";
import { frames, VIDEO } from "./utils/constants";

/**
 * Main composition.
 *
 * Structure:
 *   1. Intro (3s) - Logo animation
 *   2. Screen recording with overlays - trimmed & sped up for dynamism
 *   3. Outro (6s) - Logo + CTA
 *
 * The recording is 1280x720, we scale it to fill 1920x1080.
 */

const TRANSITION = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: frames(0.5) })}
  />
);

export const Video: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <TransitionSeries>
      {/* Intro */}
      <TransitionSeries.Sequence durationInFrames={frames(3)}>
        <Intro />
      </TransitionSeries.Sequence>

      {TRANSITION}

      {/* Screen recording with overlays */}
      <TransitionSeries.Sequence durationInFrames={frames(70)}>
        <VideoOverlays />
      </TransitionSeries.Sequence>

      {TRANSITION}

      {/* Outro */}
      <TransitionSeries.Sequence durationInFrames={frames(4)}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
