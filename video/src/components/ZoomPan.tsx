import { useCurrentFrame, interpolate, Easing } from "remotion";
import type { ZoomConfig } from "../utils/types";

type ZoomPanProps = {
  children: React.ReactNode;
  config?: ZoomConfig;
};

export const ZoomPan: React.FC<ZoomPanProps> = ({ children, config }) => {
  const frame = useCurrentFrame();

  if (!config) {
    return <>{children}</>;
  }

  const { startFrame, endFrame, fromScale, toScale, originX, originY } = config;

  const scale = interpolate(
    frame,
    [startFrame, endFrame],
    [fromScale, toScale],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.quad),
    },
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        transform: `scale(${scale})`,
        transformOrigin: `${originX}px ${originY}px`,
      }}
    >
      {children}
    </div>
  );
};
