/**
 * Creates initial masked string for guessers.
 * Preserves spaces and hyphens, turns letters into underscores.
 */
export function createInitialWordHint(word: string): string {
  return word
    .split("")
    .map((char) => (/[a-zA-Z0-9]/.test(char) ? "_" : char))
    .join(" ");
}

/**
 * Returns raw characters of the current hint as an array (without join spacing)
 * Handles multi-word hints where words are separated by triple spaces.
 */
export function hintToArray(hint: string): string[] {
  if (!hint) return [];
  const words = hint.split("   ");
  const result: string[] = [];
  words.forEach((w, idx) => {
    if (idx > 0) result.push(" ");
    const letters = w.split(" ");
    result.push(...letters);
  });
  return result;
}

/**
 * Reveals additional letters in word according to a target reveal fraction (e.g. 0.25 at 50%, 0.45 at 75%).
 * Ensures at least half of the letters remain hidden.
 */
export function revealHintLetters(
  word: string,
  currentHint: string,
  targetRevealFraction: number // e.g. 0.3 for 50% time, 0.5 for 75% time
): { hint: string; revealedIndices: number[] } {
  const letters = word.split("");
  const hintChars = hintToArray(currentHint);

  const eligibleIndices: number[] = [];
  letters.forEach((char, index) => {
    if (/[a-zA-Z0-9]/.test(char) && hintChars[index] === "_") {
      eligibleIndices.push(index);
    }
  });

  const totalAlphaChars = letters.filter((c) => /[a-zA-Z0-9]/.test(c)).length;
  // Maximum revealed letters capped at 50% of the word so guessers still have to guess
  const maxAllowedRevealed = Math.max(1, Math.floor(totalAlphaChars * 0.5));
  const alreadyRevealed = totalAlphaChars - eligibleIndices.length;
  const targetToReveal = Math.min(
    maxAllowedRevealed - alreadyRevealed,
    Math.max(1, Math.round(totalAlphaChars * targetRevealFraction))
  );

  const newlyRevealedIndices: number[] = [];

  // Deterministic shuffle using index positions or random
  const candidates = [...eligibleIndices].sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(targetToReveal, candidates.length); i++) {
    const idx = candidates[i];
    hintChars[idx] = letters[idx].toUpperCase();
    newlyRevealedIndices.push(idx);
  }

  return {
    hint: hintChars.join(" "),
    revealedIndices: newlyRevealedIndices,
  };
}

