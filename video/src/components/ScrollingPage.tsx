import { Img, staticFile } from "remotion";
import { VIDEO, SCREENSHOT } from "../utils/constants";

type ScrollingPageProps = {
  /** Array of screenshot paths (top to bottom scroll order) */
  screenshots: string[];
  /** Current scroll position in video pixels (0 = top of first screenshot's content) */
  scrollY: number;
  /**
   * Overlap between consecutive screenshots in SOURCE pixels.
   * This is how much content area is shared between two consecutive shots.
   * e.g. if you scrolled 800px between screenshots, and each content area is 1083px,
   * the overlap is 1083 - 800 = 283px.
   */
  overlapPx?: number;
};

/**
 * Displays multiple screenshots stitched vertically to simulate continuous page scrolling.
 *
 * Each screenshot is CLIPPED to only show its content area (chrome removed),
 * then they're stacked vertically with proper overlap so the scroll feels seamless.
 *
 * The key: each <Img> is inside a clipping container that hides the browser chrome
 * (top 75px) and taskbar (bottom 40px).
 */
export const ScrollingPage: React.FC<ScrollingPageProps> = ({
  screenshots,
  scrollY,
  overlapPx = 200,
}) => {
  const scaleX = VIDEO.WIDTH / SCREENSHOT.WIDTH;
  const scaleY = VIDEO.HEIGHT / SCREENSHOT.CONTENT_HEIGHT;

  // Height of each screenshot's content in video pixels
  const contentH = SCREENSHOT.CONTENT_HEIGHT * scaleY; // = VIDEO.HEIGHT (1080)
  // Overlap in video pixels
  const overlapV = overlapPx * scaleY;
  // How tall each "section" is (the unique content each screenshot adds)
  const sectionH = contentH - overlapV;

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
      {screenshots.map((src, i) => {
        // Position of this section in the scrollable space
        const sectionTop = i * sectionH;
        // Where this section appears in the viewport
        const viewportTop = sectionTop - scrollY;

        // Only render if visible (with some margin)
        if (viewportTop > VIDEO.HEIGHT + 100 || viewportTop + contentH < -100) {
          return null;
        }

        return (
          <div
            key={src}
            style={{
              position: "absolute",
              top: viewportTop,
              left: 0,
              width: VIDEO.WIDTH,
              // CLIP to content height - this hides the chrome!
              height: contentH,
              overflow: "hidden",
            }}
          >
            {/* The image is positioned so chrome top is above the clip boundary */}
            <Img
              src={staticFile(src)}
              style={{
                width: SCREENSHOT.WIDTH * scaleX,
                height: SCREENSHOT.HEIGHT * scaleY,
                position: "absolute",
                // Push image up so chrome is hidden above container top
                top: -(SCREENSHOT.CHROME_TOP * scaleY),
                left: 0,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

/**
 * Get the maximum scroll value (when the last screenshot fills the viewport).
 */
export function getMaxScroll(
  numScreenshots: number,
  overlapPx = 200,
): number {
  const scaleY = VIDEO.HEIGHT / SCREENSHOT.CONTENT_HEIGHT;
  const contentH = SCREENSHOT.CONTENT_HEIGHT * scaleY;
  const overlapV = overlapPx * scaleY;
  const sectionH = contentH - overlapV;
  // Total scrollable height: last screenshot's top position
  return (numScreenshots - 1) * sectionH;
}
