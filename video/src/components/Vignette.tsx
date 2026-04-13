import { VIDEO } from "../utils/constants";

export const Vignette: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: VIDEO.WIDTH,
        height: VIDEO.CONTENT_HEIGHT,
        zIndex: 800,
        pointerEvents: "none",
        background:
          "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.4) 100%)",
      }}
    />
  );
};
