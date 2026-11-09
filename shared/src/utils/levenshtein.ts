/**
 * Computes Levenshtein distance between two strings (case-insensitive, normalized).
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();

  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const row = Array.from({ length: s2.length + 1 }, (_, i) => i);

  for (let i = 0; i < s1.length; i++) {
    let prev = i + 1;
    for (let j = 0; j < s2.length; j++) {
      const val = s1[i] === s2[j] ? row[j] : Math.min(row[j], row[j + 1], prev) + 1;
      row[j] = prev;
      prev = val;
    }
    row[s2.length] = prev;
  }

  return row[s2.length];
}

/**
 * Checks if a guess is edit-distance-1 away from target word,
 * qualifying as "You're close!" (ignoring exact matches and short strings < 4 chars).
 */
export function isCloseGuess(guess: string, target: string): boolean {
  const g = guess.trim().toLowerCase();
  const t = target.trim().toLowerCase();

  if (g === t) return false;
  if (t.length < 4) return false;

  return levenshteinDistance(g, t) === 1;
}

/**
 * Checks if guess matches target (case-insensitive, trimmed, ignoring minor punctuation)
 */
export function isExactGuess(guess: string, target: string): boolean {
  const clean = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean(guess) === clean(target);
}

