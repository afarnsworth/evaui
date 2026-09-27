// NERV-terminal palette: phosphor greens, warning reds, sodium-lamp oranges.
export const C = {
  bg: '#030504',
  panel: '#060807',
  green: '#46ff8a',
  greenSoft: '#35d56f',
  greenDim: '#1b7a45',
  greenDeep: '#0a3520',
  lime: '#c6f23f',
  orange: '#ff8c1a',
  amber: '#ffa91f',
  amberOff: '#2a1703',
  red: '#ff2b1c',
  redDeep: '#9e0c12',
  white: '#f4f1ea',
} as const;

export const F = {
  // Heavy mincho standing in for Matisse EB, the title-card face.
  mincho: '"Shippori Mincho B1", serif',
  // Condensed grotesk for the English terminal labels.
  cond: '"Barlow Condensed", sans-serif',
  gothic: '"Noto Sans JP", sans-serif',
} as const;

export const glow = (color: string, strength = 1) =>
  `0 0 ${4 * strength}px ${color}, 0 0 ${14 * strength}px ${color}88, 0 0 ${
    32 * strength
  }px ${color}44`;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
