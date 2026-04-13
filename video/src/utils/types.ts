export type CursorKeyframe = {
  frame: number;
  x: number;
  y: number;
  click?: boolean;
};

export type TextLabelConfig = {
  text: string;
  enterFrame: number;
  exitFrame: number;
  x?: number;
  y?: number;
  align?: "left" | "center" | "right";
};

export type ZoomConfig = {
  startFrame: number;
  endFrame: number;
  fromScale: number;
  toScale: number;
  originX: number;
  originY: number;
};
