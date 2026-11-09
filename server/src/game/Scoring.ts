import { SCORING } from "@sketchroom/shared";

export function calculateGuesserScore(
  timeLeftSeconds: number,
  totalTimeSeconds: number,
  isFirstGuesser: boolean
): number {
  if (totalTimeSeconds <= 0 || timeLeftSeconds <= 0) {
    return SCORING.MIN_GUESSER_POINTS;
  }

  const fraction = Math.max(0, Math.min(1, timeLeftSeconds / totalTimeSeconds));
  const baseRange = SCORING.MAX_GUESSER_POINTS - SCORING.MIN_GUESSER_POINTS;
  let points = Math.round(SCORING.MIN_GUESSER_POINTS + baseRange * fraction);

  if (isFirstGuesser) {
    points += SCORING.FIRST_GUESS_BONUS;
  }

  return Math.min(SCORING.MAX_GUESSER_POINTS + SCORING.FIRST_GUESS_BONUS, points);
}

export function calculateDrawerScore(
  correctGuessersCount: number,
  totalGuessersCount: number
): number {
  if (correctGuessersCount === 0) return 0;

  let points = correctGuessersCount * SCORING.DRAWER_POINTS_PER_GUESSER;

  if (totalGuessersCount > 0 && correctGuessersCount === totalGuessersCount) {
    points += SCORING.DRAWER_ALL_GUESSED_BONUS;
  }

  return Math.min(SCORING.DRAWER_MAX_POINTS, points);
}
