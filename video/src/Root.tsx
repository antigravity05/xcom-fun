import { Composition } from "remotion";
import { Video } from "./Video";
import { VIDEO, frames, TRANSITION_FRAMES } from "./utils/constants";
import { getTotalVideoOverlaysDuration } from "./scenes/VideoOverlays";

// Total duration:
// Intro (3s) + Video overlays (~70s) + Outro (6s) - 2 transitions
const introDuration = frames(3);
const videoDuration = getTotalVideoOverlaysDuration(VIDEO.FPS);
const outroDuration = frames(4);
const totalDuration = introDuration + videoDuration + outroDuration - 2 * TRANSITION_FRAMES;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ProductDemo"
      component={Video}
      durationInFrames={totalDuration}
      fps={VIDEO.FPS}
      width={VIDEO.WIDTH}
      height={VIDEO.HEIGHT}
    />
  );
};
