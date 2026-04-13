export const VIDEO = {
  WIDTH: 1920,
  HEIGHT: 1080,
  FPS: 30,
  BANNER_HEIGHT: 70,
  CONTENT_HEIGHT: 1010, // 1080 - 70
} as const;

// Screenshot dimensions and chrome crop values
export const SCREENSHOT = {
  WIDTH: 1918,
  HEIGHT: 1198,
  CHROME_TOP: 75,      // browser tabs + address bar
  TASKBAR_BOTTOM: 40,  // Windows taskbar
  CONTENT_TOP: 75,
  CONTENT_HEIGHT: 1083, // 1198 - 75 - 40
} as const;

// Recording video dimensions and chrome crop values (1280x720)
export const RECORDING = {
  WIDTH: 1280,
  HEIGHT: 720,
  CHROME_TOP: 50,      // browser tabs + address bar at 720p
  TASKBAR_BOTTOM: 30,  // Windows taskbar at 720p
  CONTENT_HEIGHT: 640, // 720 - 50 - 30
} as const;

// Brand colors from XCOM.COM globals.css
export const COLORS = {
  BACKGROUND: "#000000",
  FOREGROUND: "#e7e9ea",
  SURFACE: "#16181c",
  SURFACE_ELEVATED: "#1d1f23",
  PANEL: "rgba(22, 24, 28, 0.92)",
  LINE_STRONG: "rgba(231, 233, 234, 0.2)",
  LINE_SOFT: "rgba(255, 255, 255, 0.08)",
  COPY_MUTED: "#71767b",
  ACCENT_PINK: "#f91880",
  ACCENT_BLUE: "#1d9bf0",
  ACCENT_GREEN: "#00ba7c",
  DANGER: "#f4212e",
} as const;

export const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Scene durations in seconds
export const SCENE_DURATION = {
  INTRO: 3,
  LANDING: 12,
  CONNECT: 10,
  CREATE_COMMUNITY: 10,
  POST_TWEET: 10,
  INTERACT: 15,
  VIEW_ON_X: 9,
  OUTRO: 4,
} as const;

// Convert seconds to frames
export const frames = (seconds: number) => Math.round(seconds * VIDEO.FPS);

// Transition duration between scenes
export const TRANSITION_FRAMES = frames(0.5);
