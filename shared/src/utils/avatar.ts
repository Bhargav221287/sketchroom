import {
  AvatarAccessory,
  AvatarConfig,
  AvatarEyes,
  AvatarFaceShape,
  AvatarMouth,
} from "../types/index.js";

export const FACE_SHAPES: AvatarFaceShape[] = ["round", "square", "oval", "blob"];
export const EYES: AvatarEyes[] = ["dots", "happy", "winking", "cool", "sleepy", "star"];
export const MOUTHS: AvatarMouth[] = ["smile", "grin", "tongue", "open", "neutral"];
export const ACCESSORIES: AvatarAccessory[] = [
  "none",
  "glasses",
  "sunglasses",
  "hat",
  "crown",
  "headband",
  "mustache",
];

export const FACE_COLORS = [
  "#FFDBAC", // Light skin
  "#F1C27D", // Fair skin
  "#E0AC69", // Medium skin
  "#C68642", // Tan skin
  "#8D5524", // Deep skin
  "#FDE047", // Yellow (cartoon)
  "#A78BFA", // Purple
  "#60A5FA", // Sky blue
  "#34D399", // Emerald
  "#F472B6", // Pink
];

export const BG_COLORS = [
  "#EDE9FE", // Light Grape
  "#E0F2FE", // Light Sky
  "#FFEDD5", // Light Orange
  "#D1FAE5", // Light Mint
  "#FCE7F3", // Light Rose
  "#FEF3C7", // Light Amber
  "#E2E8F0", // Light Slate
];

export function serializeAvatar(config: AvatarConfig): string {
  const fIdx = Math.max(0, FACE_SHAPES.indexOf(config.faceShape));
  const fcIdx = Math.max(0, FACE_COLORS.indexOf(config.faceColor));
  const eIdx = Math.max(0, EYES.indexOf(config.eyes));
  const mIdx = Math.max(0, MOUTHS.indexOf(config.mouth));
  const aIdx = Math.max(0, ACCESSORIES.indexOf(config.accessory));
  const bgIdx = Math.max(0, BG_COLORS.indexOf(config.bgColor));

  return `${fIdx}.${fcIdx}.${eIdx}.${mIdx}.${aIdx}.${bgIdx}`;
}

export function deserializeAvatar(code: string): AvatarConfig {
  const parts = code.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 6 || parts.some((n) => isNaN(n))) {
    return generateRandomAvatar();
  }

  const [f, fc, e, m, a, bg] = parts;
  return {
    faceShape: FACE_SHAPES[f % FACE_SHAPES.length] || "round",
    faceColor: FACE_COLORS[fc % FACE_COLORS.length] || FACE_COLORS[0],
    eyes: EYES[e % EYES.length] || "dots",
    mouth: MOUTHS[m % MOUTHS.length] || "smile",
    accessory: ACCESSORIES[a % ACCESSORIES.length] || "none",
    bgColor: BG_COLORS[bg % BG_COLORS.length] || BG_COLORS[0],
  };
}

export function generateRandomAvatar(): AvatarConfig {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return {
    faceShape: pick(FACE_SHAPES),
    faceColor: pick(FACE_COLORS),
    eyes: pick(EYES),
    mouth: pick(MOUTHS),
    accessory: pick(ACCESSORIES),
    bgColor: pick(BG_COLORS),
  };
}

