import { describe, expect, it } from "vitest";
import { isCloseGuess, isExactGuess, levenshteinDistance } from "../levenshtein.js";
import { createInitialWordHint, revealHintLetters } from "../masking.js";
import { deserializeAvatar, generateRandomAvatar, serializeAvatar } from "../avatar.js";
import { sanitizeNickname } from "../sanitize.js";

describe("Levenshtein & Proximity Detection", () => {
  it("computes correct distance between strings", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    expect(levenshteinDistance("cat", "cat")).toBe(0);
    expect(levenshteinDistance("cat", "cut")).toBe(1);
    expect(levenshteinDistance("apple", "aple")).toBe(1);
  });

  it("detects close guess for edit distance 1 with words >= 4 chars", () => {
    expect(isCloseGuess("elefant", "elephant")).toBe(false); // distance is 2
    expect(isCloseGuess("elephent", "elephant")).toBe(true); // distance 1
    expect(isCloseGuess("piza", "pizza")).toBe(true); // distance 1
    expect(isCloseGuess("pizza", "pizza")).toBe(false); // exact match is not 'close'
    expect(isCloseGuess("cot", "cat")).toBe(false); // < 4 chars
  });

  it("detects exact guesses ignoring case and punctuation", () => {
    expect(isExactGuess("Pizza", "pizza")).toBe(true);
    expect(isExactGuess("  hot-dog  ", "hot dog")).toBe(true);
    expect(isExactGuess("burger!", "burger")).toBe(true);
  });
});

describe("Word Hint & Masking Engine", () => {
  it("masks words preserving spaces and punctuation", () => {
    expect(createInitialWordHint("cat")).toBe("_ _ _");
    expect(createInitialWordHint("ice cream")).toBe("_ _ _   _ _ _ _ _");
    expect(createInitialWordHint("t-shirt")).toBe("_ - _ _ _ _ _");
  });

  it("reveals letters progressively without exceeding 50% limit", () => {
    const word = "elephant";
    const initial = createInitialWordHint(word);
    const step1 = revealHintLetters(word, initial, 0.25);

    expect(step1.revealedIndices.length).toBeGreaterThan(0);
    const revealedChars = step1.hint.split(" ").filter((c) => c !== "_");
    expect(revealedChars.length).toBeLessThanOrEqual(4); // <= 50% of 8
  });
});

describe("Avatar Serialization", () => {
  it("serializes and deserializes accurately", () => {
    const avatar = generateRandomAvatar();
    const serialized = serializeAvatar(avatar);
    const restored = deserializeAvatar(serialized);

    expect(restored.faceShape).toBe(avatar.faceShape);
    expect(restored.faceColor).toBe(avatar.faceColor);
    expect(restored.eyes).toBe(avatar.eyes);
    expect(restored.mouth).toBe(avatar.mouth);
    expect(restored.accessory).toBe(avatar.accessory);
    expect(restored.bgColor).toBe(avatar.bgColor);
  });
});

describe("Sanitizer", () => {
  it("sanitizes nicknames and clips long ones", () => {
    expect(sanitizeNickname("")).toBe("Doodler");
    expect(sanitizeNickname("<b>Bob</b>")).toBe("bBobb");
    expect(sanitizeNickname("<script>alert('xss')</script>Bob").length).toBe(20);
    expect(sanitizeNickname("A".repeat(30)).length).toBeLessThanOrEqual(20);
  });
});
