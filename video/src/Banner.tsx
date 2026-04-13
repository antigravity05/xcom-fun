import { loadFont } from "@remotion/google-fonts/Inter";
import { Still } from "remotion";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const COLORS = {
  BG: "#000000",
  FG: "#e7e9ea",
  MUTED: "#71767b",
  BLUE: "#1d9bf0",
  PINK: "#f91880",
  GREEN: "#00ba7c",
};

export const Banner: React.FC = () => {
  return (
    <div
      style={{
        width: 1500,
        height: 500,
        background: COLORS.BG,
        fontFamily,
        color: COLORS.FG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow effects */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(29,155,240,0.15), transparent 70%)`,
          left: "5%",
          top: "-30%",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(249,24,128,0.1), transparent 70%)`,
          right: "10%",
          bottom: "-20%",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 80,
        }}
      >
        {/* Left: Logo */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              style={{
                fontSize: 72,
                fontWeight: 900,
                letterSpacing: -3,
                background: `linear-gradient(135deg, #4FC3F7, ${COLORS.BLUE}, #0D47A1)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              x
            </span>
            <span style={{ fontSize: 72, fontWeight: 900, letterSpacing: -3, color: COLORS.FG }}>
              -com
            </span>
            <span style={{ fontSize: 72, fontWeight: 900, letterSpacing: -3, color: COLORS.BLUE }}>
              .fun
            </span>
          </div>
          <span
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: COLORS.MUTED,
              letterSpacing: 2,
              textTransform: "uppercase" as const,
            }}
          >
            X communities are back
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 2,
            height: 200,
            background: `linear-gradient(to bottom, transparent, rgba(231,233,234,0.15), transparent)`,
          }}
        />

        {/* Right: Features */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {[
            { color: COLORS.BLUE, text: "Post once, it tweets for you", sub: "Auto-sync every post to your X account" },
            { color: COLORS.PINK, text: "Create your community", sub: "Name, banner, members, all in seconds" },
            { color: COLORS.GREEN, text: "Everything syncs to X", sub: "Likes, comments, reposts, all connected" },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>{f.text}</div>
                <div style={{ fontSize: 15, fontWeight: 400, color: COLORS.MUTED, marginTop: 2 }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 1500,
          height: 3,
          background: `linear-gradient(90deg, ${COLORS.BLUE}, ${COLORS.PINK}, ${COLORS.GREEN})`,
        }}
      />
    </div>
  );
};
