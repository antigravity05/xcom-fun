import { Composition, Still } from "remotion";
import { Video } from "./Video";
import { ShortVideo, getShortVideoDuration } from "./scenes/ShortVideo";
import { Banner } from "./Banner";
import { VIDEO, frames, TRANSITION_FRAMES } from "./utils/constants";
import { getTotalVideoOverlaysDuration } from "./scenes/VideoOverlays";

// Full video duration
const introDuration = frames(3);
const videoDuration = getTotalVideoOverlaysDuration(VIDEO.FPS);
const outroDuration = frames(4);
const totalDuration = introDuration + videoDuration + outroDuration - 2 * TRANSITION_FRAMES;

// Short video duration
const shortClipsDuration = getShortVideoDuration(VIDEO.FPS);
const shortIntro = frames(1.5);
const shortOutro = frames(2);
const shortTransitions = 2 * frames(0.3);
const shortTotalDuration = shortIntro + shortClipsDuration + shortOutro - shortTransitions;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ProductDemo"
        component={Video}
        durationInFrames={totalDuration}
        fps={VIDEO.FPS}
        width={VIDEO.WIDTH}
        height={VIDEO.HEIGHT}
      />
      <Composition
        id="ProductDemoShort"
        component={ShortVideo}
        durationInFrames={shortTotalDuration}
        fps={VIDEO.FPS}
        width={VIDEO.WIDTH}
        height={VIDEO.HEIGHT}
      />
      <Still
        id="Banner"
        component={Banner}
        width={1500}
        height={500}
      />
    </>
  );
};
