import type { SpringConfig } from "remotion";

// Spring presets matching Remotion best practices
export const SPRING_SMOOTH: Partial<SpringConfig> = { damping: 200 };
export const SPRING_SNAPPY: Partial<SpringConfig> = { damping: 20, stiffness: 200 };
export const SPRING_BOUNCY: Partial<SpringConfig> = { damping: 8 };
export const SPRING_HEAVY: Partial<SpringConfig> = { damping: 15, stiffness: 80, mass: 2 };

// Interpolate cursor position between keyframes
export function getCursorPosition(
  frame: number,
  keyframes: { frame: number; x: number; y: number }[],
): { x: number; y: number } {
  if (keyframes.length === 0) return { x: 0, y: 0 };
  if (keyframes.length === 1) return { x: keyframes[0].x, y: keyframes[0].y };

  // Find surrounding keyframes
  let prev = keyframes[0];
  let next = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (frame >= keyframes[i].frame && frame <= keyframes[i + 1].frame) {
      prev = keyframes[i];
      next = keyframes[i + 1];
      break;
    }
  }

  if (frame <= prev.frame) return { x: prev.x, y: prev.y };
  if (frame >= next.frame) return { x: next.x, y: next.y };

  // Ease-in-out interpolation
  const progress = (frame - prev.frame) / (next.frame - prev.frame);
  const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  return {
    x: prev.x + (next.x - prev.x) * eased,
    y: prev.y + (next.y - prev.y) * eased,
  };
}
