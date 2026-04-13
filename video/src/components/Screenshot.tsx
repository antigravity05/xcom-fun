import { Img, staticFile } from "remotion";
import { VIDEO, SCREENSHOT } from "../utils/constants";

type ScreenshotProps = {
  src: string;
  style?: React.CSSProperties;
  /** Vertical scroll offset in source pixels (pre-crop coords) */
  scrollY?: number;
};

/**
 * Displays a screenshot with browser chrome cropped out.
 *
 * The screenshot is 1918x1198 with 75px chrome at top and 40px taskbar at bottom.
 * We crop to the 1918x1083 content area and scale to fill the 1920x1080 video frame.
 *
 * All coordinate references in scenes should use SOURCE coordinates (as seen in the
 * original screenshot), and this component handles the offset/scale mapping.
 */
export const Screenshot: React.FC<ScreenshotProps> = ({
  src,
  style,
  scrollY = 0,
}) => {
  // Scale factor: video width / screenshot content width
  const scaleX = VIDEO.WIDTH / SCREENSHOT.WIDTH;
  const scaleY = VIDEO.HEIGHT / SCREENSHOT.CONTENT_HEIGHT;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: VIDEO.WIDTH,
        height: VIDEO.HEIGHT,
        overflow: "hidden",
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          width: SCREENSHOT.WIDTH * scaleX,
          height: SCREENSHOT.HEIGHT * scaleY,
          position: "absolute",
          // Shift up to crop the browser chrome, then apply scroll
          top: (-SCREENSHOT.CHROME_TOP - scrollY) * scaleY,
          left: 0,
          ...style,
        }}
      />
    </div>
  );
};

/**
 * Convert a source Y coordinate (from the screenshot) to video Y coordinate.
 * Use this to position overlays (cursor, click effects, labels) correctly.
 */
export function sourceToVideoY(sourceY: number): number {
  const scaleY = VIDEO.HEIGHT / SCREENSHOT.CONTENT_HEIGHT;
  return (sourceY - SCREENSHOT.CHROME_TOP) * scaleY;
}

/**
 * Convert a source X coordinate to video X coordinate.
 */
export function sourceToVideoX(sourceX: number): number {
  const scaleX = VIDEO.WIDTH / SCREENSHOT.WIDTH;
  return sourceX * scaleX;
}
