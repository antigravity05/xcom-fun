import { Sequence, useVideoConfig, interpolate, staticFile } from "remotion";
import { Video } from "@remotion/media";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { loadFont } from "@remotion/google-fonts/Inter";
import { Intro } from "./Intro";
import { Outro } from "./Outro";
import { TextLabel } from "../components/TextLabel";
import { Vignette } from "../components/Vignette";
import { ProgressBar } from "../components/ProgressBar";
import { frames, VIDEO, COLORS } from "../utils/constants";

const { fontFamily } = loadFont("normal", {
  weights: ["700", "800"],
  subsets: ["latin"],
});

const CHROME_OFFSET = 140;

/**
 * 15-second short version for stories/reels.
 * Only the most impactful moments.
 */

type Clip = {
  sourceStart: number;
  sourceEnd: number;
  speed: number;
  label?: string;
  labelAccent?: string;
};

const CLIPS: Clip[] = [
  // Landing hero
  { sourceStart: 2, sourceEnd: 5, speed: 2, label: "X communities are back", labelAccent: COLORS.ACCENT_BLUE },
  // Click Get Started + Connect
  { sourceStart: 9, sourceEnd: 12, speed: 2 },
  // Click Authorize
  { sourceStart: 16.5, sourceEnd: 18, speed: 1.5, label: "One click to connect", labelAccent: COLORS.ACCENT_GREEN },
  // Click New Community + create
  { sourceStart: 28, sourceEnd: 30, speed: 2, label: "Create your community", labelAccent: COLORS.ACCENT_PINK },
  // Post published
  { sourceStart: 91, sourceEnd: 93, speed: 1, label: "Post, it syncs to X", labelAccent: COLORS.ACCENT_BLUE },
  // X.com synced
  { sourceStart: 99, sourceEnd: 100, speed: 0.8, label: "Everything syncs", labelAccent: COLORS.ACCENT_GREEN },
];

function getClipDuration(clip: Clip, fps: number): number {
  return Math.round(((clip.sourceEnd - clip.sourceStart) / clip.speed) * fps);
}

export function getShortVideoDuration(fps: number): number {
  let total = 0;
  for (const clip of CLIPS) total += getClipDuration(clip, fps);
  return total;
}

const ClipPlayer: React.FC<{ clip: Clip }> = ({ clip }) => {
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: VIDEO.WIDTH,
        height: VIDEO.CONTENT_HEIGHT,
        overflow: "hidden",
        background: "#000",
      }}
    >
      <Video
        src={staticFile("recording.mp4")}
        style={{
          width: VIDEO.WIDTH,
          height: VIDEO.WIDTH * 720 / 1280,
          position: "absolute",
          top: -CHROME_OFFSET * (VIDEO.CONTENT_HEIGHT / VIDEO.HEIGHT),
          left: 0,
        }}
        muted
        playbackRate={clip.speed}
        trimBefore={Math.round(clip.sourceStart * fps)}
        trimAfter={Math.round(clip.sourceEnd * fps)}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: VIDEO.WIDTH,
          height: 80,
          background: "linear-gradient(to bottom, transparent 0%, #000 45%)",
          zIndex: 5,
        }}
      />
    </div>
  );
};

export const ShortVideo: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();

  const clipsDuration = getShortVideoDuration(fps);

  const TRANSITION = (
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: frames(0.3) })}
    />
  );

  // Build clip sequences
  let currentFrame = 0;
  const clipSequences: Array<{ from: number; duration: number; clip: Clip }> = [];
  for (const clip of CLIPS) {
    const duration = getClipDuration(clip, fps);
    clipSequences.push({ from: currentFrame, duration, clip });
    currentFrame += duration;
  }

  return (
    <div style={{ width: VIDEO.WIDTH, height: VIDEO.HEIGHT, position: "relative", background: "#000" }}>
      <TransitionSeries>
        {/* Quick intro */}
        <TransitionSeries.Sequence durationInFrames={frames(1.5)}>
          <Intro />
        </TransitionSeries.Sequence>

        {TRANSITION}

        {/* Clips */}
        <TransitionSeries.Sequence durationInFrames={clipsDuration}>
          <div style={{ width: VIDEO.WIDTH, height: VIDEO.HEIGHT, position: "relative" }}>
            {clipSequences.map((seq, i) => (
              <Sequence
                key={i}
                from={seq.from}
                durationInFrames={seq.duration + 3}
                premountFor={10}
              >
                <ClipPlayer clip={seq.clip} />
                {seq.clip.label && (
                  <TextLabel
                    text={seq.clip.label}
                    enterFrame={frames(0.1)}
                    exitFrame={seq.duration - frames(0.2)}
                    accent={seq.clip.labelAccent}
                  />
                )}
              </Sequence>
            ))}
          </div>
        </TransitionSeries.Sequence>

        {TRANSITION}

        {/* Quick outro */}
        <TransitionSeries.Sequence durationInFrames={frames(2)}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <Vignette />

      {/* Separator */}
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

      {/* Music */}
      <Audio
        src={staticFile("music.mp3")}
        volume={(f) => {
          const fadeIn = interpolate(f, [0, 0.5 * fps], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const fadeOut = interpolate(f, [durationInFrames - 1 * fps, durationInFrames], [1, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return Math.min(fadeIn, fadeOut) * 0.2;
        }}
      />

      <ProgressBar />
    </div>
  );
};
