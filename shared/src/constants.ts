export const APP_NAME = "SketchRoom";

export const ROOM_CODE_LENGTH = 5;
export const MIN_PLAYERS_TO_START = 3;
export const MAX_PLAYERS_PER_ROOM = 10;

export const DEFAULT_ROUNDS = 3;
export const MIN_ROUNDS = 2;
export const MAX_ROUNDS = 5;

export const DEFAULT_DRAW_TIME_SECONDS = 80;
export const MIN_DRAW_TIME_SECONDS = 30;
export const MAX_DRAW_TIME_SECONDS = 120;

export const WORD_CHOICE_DURATION_SECONDS = 15;
export const TURN_SUMMARY_DURATION_SECONDS = 8;
export const RECONNECT_WINDOW_SECONDS = 60;
export const ROOM_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export const MAX_NICKNAME_LENGTH = 20;
export const MAX_CHAT_LENGTH = 150;

export const SCORING = {
  MAX_GUESSER_POINTS: 500,
  MIN_GUESSER_POINTS: 100,
  FIRST_GUESS_BONUS: 50,
  DRAWER_POINTS_PER_GUESSER: 75,
  DRAWER_ALL_GUESSED_BONUS: 100,
  DRAWER_MAX_POINTS: 500,
} as const;

export const PALETTE_COLORS = [
  "#000000", // Black
  "#FFFFFF", // White
  "#6B7280", // Gray
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#EAB308", // Yellow
  "#84CC16", // Lime
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#0EA5E9", // Sky
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#D946EF", // Fuchsia
  "#EC4899", // Pink
  "#78350F", // Brown
] as const;

export const EMOJI_REACTIONS = ["👍", "😂", "😮", "🔥", "❤️", "👏"] as const;
