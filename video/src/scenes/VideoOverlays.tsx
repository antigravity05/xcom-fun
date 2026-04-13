import { Sequence, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { Video } from "@remotion/media";
import { staticFile } from "remotion";
import { TextLabel } from "../components/TextLabel";
import { frames, VIDEO, RECORDING, COLORS, FONT_FAMILY } from "../utils/constants";

type Segment = {
  sourceStart: number;
  sourceEnd: number;
  speed: number;
  label?: string;
  labelSize?: "small" | "medium" | "large" | "hero";
  labelPosition?: "bottom" | "top" | "center";
  labelAccent?: string;
  blur?: boolean;
  /** Zoom pulse: [originX%, originY%, intensity] */
  zoom?: [number, number, number];
};

const CHROME_OFFSET = 140;

const SEGMENTS: Segment[] = [
  // SKIP 0-2s (OBS studio)
  // Landing hero — zoom out reveal
  { sourceStart: 2, sourceEnd: 4, speed: 1.3, zoom: [50, 40, -0.1],
    label: "X communities are back", labelSize: "hero", labelAccent: COLORS.ACCENT_BLUE },
  // Landing scroll
  { sourceStart: 4, sourceEnd: 8, speed: 3 },
  // Approaching "Get started"
  { sourceStart: 8, sourceEnd: 9, speed: 2 },
  // CLICK "Get started" — zoom on button
  { sourceStart: 9, sourceEnd: 10, speed: 0.8, zoom: [55, 65, 0.25] },
  // Connect X page
  { sourceStart: 10, sourceEnd: 11, speed: 2,
    label: "One-click login via X", labelAccent: COLORS.ACCENT_BLUE },
  // CLICK "Connect with X"
  { sourceStart: 11, sourceEnd: 12, speed: 0.8, zoom: [50, 45, 0.25] },
  // OAuth loading
  { sourceStart: 12, sourceEnd: 14, speed: 3 },
  // OAuth page
  { sourceStart: 14, sourceEnd: 16, speed: 2,
    label: "Secure OAuth 2.0", labelSize: "medium", labelAccent: COLORS.ACCENT_GREEN },
  // CLICK "Authorize app" + see it load
  { sourceStart: 16, sourceEnd: 19, speed: 0.8, zoom: [50, 50, 0.2] },
  // SKIP 18-24s
  // Explore connected
  { sourceStart: 24, sourceEnd: 28, speed: 3,
    label: "You're in", labelSize: "medium", labelAccent: COLORS.ACCENT_GREEN },
  // CLICK "New Community"
  { sourceStart: 28, sourceEnd: 29.5, speed: 0.8, zoom: [15, 30, 0.3],
    label: "Create a community", labelAccent: COLORS.ACCENT_PINK },
  // Navigate to form
  { sourceStart: 29.5, sourceEnd: 30, speed: 2 },
  // Form: typing name — zoom on the form
  { sourceStart: 30, sourceEnd: 34, speed: 3, zoom: [45, 35, 0.3],
    label: "Name your community", labelSize: "medium" },
  // CLICK name field
  { sourceStart: 34, sourceEnd: 35, speed: 0.8, zoom: [45, 35, 0.3] },
  // Typing description — zoom on form area
  { sourceStart: 35, sourceEnd: 44, speed: 4, zoom: [45, 45, 0.25] },
  // CLICK banner upload
  { sourceStart: 44, sourceEnd: 45.5, speed: 0.8, zoom: [45, 55, 0.25],
    label: "Add a banner", labelSize: "medium" },
  // Banner upload rest
  { sourceStart: 45.5, sourceEnd: 48, speed: 3 },
  // File picker (banner)
  { sourceStart: 48, sourceEnd: 56, speed: 10 },
  // Banner loaded — zoom on the banner
  { sourceStart: 56, sourceEnd: 57, speed: 1.5, zoom: [45, 50, 0.2] },
  // CLICK "Create community"
  { sourceStart: 57, sourceEnd: 58, speed: 0.8, zoom: [35, 75, 0.3] },
  // Community created — zoom out reveal
  { sourceStart: 58, sourceEnd: 62, speed: 2, zoom: [50, 40, -0.1],
    label: "Community ready", labelAccent: COLORS.ACCENT_GREEN },
  // SKIP 62-85s
  // Composer ready — zoom on composer
  { sourceStart: 85, sourceEnd: 87, speed: 0.8, zoom: [45, 40, 0.25],
    label: "Write, attach, post", labelAccent: COLORS.ACCENT_BLUE },
  // CLICK "Post"
  { sourceStart: 87, sourceEnd: 88, speed: 0.6, zoom: [65, 65, 0.3] },
  // Post publishing — zoom out to show result
  { sourceStart: 88, sourceEnd: 92, speed: 1.5, zoom: [50, 50, -0.08],
    label: "Auto-synced to X", labelSize: "medium", labelAccent: COLORS.ACCENT_GREEN },
  // CLICK like — zoom on interactions
  { sourceStart: 92, sourceEnd: 93, speed: 0.7, zoom: [45, 80, 0.25],
    label: "Like, comment, retweet", labelAccent: COLORS.ACCENT_PINK },
  // SKIP src 93-96
  // CLICK post → X
  { sourceStart: 96, sourceEnd: 97.5, speed: 0.8, zoom: [50, 40, 0.2],
    label: "View on X", labelAccent: COLORS.ACCENT_BLUE },
  // X.com synced — zoom out reveal
  { sourceStart: 97.5, sourceEnd: 100, speed: 1, zoom: [50, 35, -0.1],
    label: "Everything syncs", labelSize: "hero", labelAccent: COLORS.ACCENT_GREEN },
];

function getSegmentOutputDuration(seg: Segment, fps: number): number {
  const sourceDuration = seg.sourceEnd - seg.sourceStart;
  return Math.round((sourceDuration / seg.speed) * fps);
}

const BlurOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 5, 10], [0, 0.95, 0.95], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#000",
          opacity,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 51,
          opacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <svg width="56" height="56" viewBox="0 0 24 24" fill={COLORS.COPY_MUTED}>
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
        </svg>
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 24,
            fontWeight: 600,
            color: COLORS.COPY_MUTED,
          }}
        >
          Selecting a photo...
        </span>
      </div>
    </div>
  );
};

const CROSSFADE_FRAMES = 8; // ~0.27s crossfade

const CroppedVideo: React.FC<{
  speed: number;
  sourceStart: number;
  sourceEnd: number;
  fadeIn?: boolean;
  fadeOut?: boolean;
  /** Zoom: [originX%, originY%, intensity] — pulse zoom (sin curve, no jump) */
  zoom?: [number, number, number];
}> = ({ speed, sourceStart, sourceEnd, fadeIn, fadeOut, zoom }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Crossfade envelope
  let opacity = 1;
  if (fadeIn) {
    opacity = Math.min(opacity, interpolate(frame, [0, CROSSFADE_FRAMES], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    }));
  }
  if (fadeOut) {
    opacity = Math.min(opacity, interpolate(frame, [durationInFrames - CROSSFADE_FRAMES, durationInFrames], [1, 0], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    }));
  }

  // Zoom hold: ramp up 20%, hold 60%, ramp down 20%
  let zoomScale = 1;
  if (zoom) {
    const progress = frame / durationInFrames;
    if (progress < 0.2) {
      // Ramp up
      zoomScale = 1 + zoom[2] * (progress / 0.2);
    } else if (progress < 0.8) {
      // Hold
      zoomScale = 1 + zoom[2];
    } else {
      // Ramp down
      zoomScale = 1 + zoom[2] * (1 - (progress - 0.8) / 0.2);
    }
  }
  const zoomOrigin = zoom ? `${zoom[0]}% ${zoom[1]}%` : "50% 50%";

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
        opacity,
      }}
    >
      <Video
        src={staticFile("recording.mp4")}
        style={{
          width: VIDEO.WIDTH,
          height: VIDEO.WIDTH * 720 / 1280, // maintain 16:9 from source
          position: "absolute",
          top: -CHROME_OFFSET * (VIDEO.CONTENT_HEIGHT / VIDEO.HEIGHT),
          left: 0,
        }}
        muted
        playbackRate={speed}
        trimBefore={Math.round(sourceStart * fps)}
        trimAfter={Math.round(sourceEnd * fps)}
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

export const VideoOverlays: React.FC = () => {
  const { fps } = useVideoConfig();

  let currentFrame = 0;
  const sequences: Array<{
    from: number;
    duration: number;
    segment: Segment;
  }> = [];

  for (const seg of SEGMENTS) {
    const duration = getSegmentOutputDuration(seg, fps);
    sequences.push({ from: currentFrame, duration, segment: seg });
    currentFrame += duration;
  }

  return (
    <div
      style={{
        width: VIDEO.WIDTH,
        height: VIDEO.HEIGHT,
        background: "#000",
        position: "relative",
      }}
    >
      {sequences.map((seq, i) => {
        // Detect source time jumps (>2s gap) for crossfade
        const prevEnd = i > 0 ? SEGMENTS[i - 1].sourceEnd : seq.segment.sourceStart;
        const nextStart = i < SEGMENTS.length - 1 ? SEGMENTS[i + 1].sourceStart : seq.segment.sourceEnd;
        const hasJumpBefore = seq.segment.sourceStart - prevEnd > 2;
        const hasJumpAfter = nextStart - seq.segment.sourceEnd > 2;

        return (
        <Sequence
          key={i}
          from={seq.from}
          durationInFrames={seq.duration}
          premountFor={frames(0.3)}
        >
          <CroppedVideo
            speed={seq.segment.speed}
            sourceStart={seq.segment.sourceStart}
            sourceEnd={seq.segment.sourceEnd}
            fadeIn={hasJumpBefore}
            fadeOut={hasJumpAfter || !!seq.segment.blur}
            zoom={seq.segment.zoom}
          />

          {seq.segment.blur && <BlurOverlay />}

          {seq.segment.label && !seq.segment.blur && (
            <TextLabel
              text={seq.segment.label}
              enterFrame={frames(0.2)}
              exitFrame={seq.duration - frames(0.3)}
              size={seq.segment.labelSize || "large"}
              accent={seq.segment.labelAccent}
            />
          )}
        </Sequence>
        );
      })}
    </div>
  );
};

export function getTotalVideoOverlaysDuration(fps: number): number {
  let total = 0;
  for (const seg of SEGMENTS) {
    total += getSegmentOutputDuration(seg, fps);
  }
  return total;
}
