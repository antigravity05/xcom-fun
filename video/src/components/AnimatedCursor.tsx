import { useCurrentFrame } from "remotion";
import type { CursorKeyframe } from "../utils/types";
import { getCursorPosition } from "../utils/animations";

type AnimatedCursorProps = {
  keyframes: CursorKeyframe[];
  visible?: boolean;
};

export const AnimatedCursor: React.FC<AnimatedCursorProps> = ({
  keyframes,
  visible = true,
}) => {
  const frame = useCurrentFrame();

  if (!visible || keyframes.length === 0) return null;

  const { x, y } = getCursorPosition(frame, keyframes);

  // Check if we're clicking at this frame
  const isClicking = keyframes.some(
    (kf) => kf.click && Math.abs(frame - kf.frame) < 3,
  );

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 1000,
        pointerEvents: "none",
        transform: isClicking ? "scale(0.85)" : "scale(1)",
        filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))",
      }}
    >
      {/* macOS-style cursor */}
      <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
        <path
          d="M1 1L1 21.5L6.5 16.5L11 25L15 23L10.5 14.5L18 14.5L1 1Z"
          fill="white"
          stroke="black"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
