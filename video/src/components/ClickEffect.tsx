import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../utils/constants";

type ClickEffectProps = {
  x: number;
  y: number;
  triggerFrame: number;
  color?: string;
};

const DURATION = 18; // frames

export const ClickEffect: React.FC<ClickEffectProps> = ({
  x,
  y,
  triggerFrame,
  color = COLORS.ACCENT_PINK,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - triggerFrame;

  if (localFrame < 0 || localFrame > DURATION) return null;

  const scale = interpolate(localFrame, [0, DURATION], [0, 2], {
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(localFrame, [0, DURATION * 0.3, DURATION], [0.6, 0.4, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 999,
        pointerEvents: "none",
      }}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            opacity: opacity * (1 - i * 0.3),
            transform: `translate(-50%, -50%) scale(${scale * (1 + i * 0.4)})`,
          }}
        />
      ))}
    </div>
  );
};
