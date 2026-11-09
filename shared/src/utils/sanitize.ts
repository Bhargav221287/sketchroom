import { MAX_CHAT_LENGTH, MAX_NICKNAME_LENGTH } from "../constants.js";

const PROFANITY_LIST = [
  "nigger",
  "nigga",
  "faggot",
  "cunt",
  "chink",
  "kike",
  "retard",
];

export function sanitizeNickname(raw: string): string {
  if (!raw) return "Doodler";
  // Strip control chars, HTML tags, limit length
  let cleaned = raw.replace(/[<>&"'/]/g, "").trim();
  if (cleaned.length === 0) cleaned = "Doodler";
  if (cleaned.length > MAX_NICKNAME_LENGTH) {
    cleaned = cleaned.substring(0, MAX_NICKNAME_LENGTH).trim();
  }
  return cleaned;
}

export function sanitizeChatMessage(raw: string): string {
  if (!raw) return "";
  let cleaned = raw.trim();
  if (cleaned.length > MAX_CHAT_LENGTH) {
    cleaned = cleaned.substring(0, MAX_CHAT_LENGTH).trim();
  }
  return cleaned;
}

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase().replace(/[\s\-_0-9]/g, "");
  return PROFANITY_LIST.some((word) => lower.includes(word));
}
