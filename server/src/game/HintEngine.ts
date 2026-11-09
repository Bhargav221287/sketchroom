import { createInitialWordHint, revealHintLetters } from "@sketchroom/shared";

export class HintEngine {
  private secretWord: string = "";
  private currentHint: string = "";
  private revealed50: boolean = false;
  private revealed75: boolean = false;

  public initialize(secretWord: string): string {
    this.secretWord = secretWord;
    this.currentHint = createInitialWordHint(secretWord);
    this.revealed50 = false;
    this.revealed75 = false;
    return this.currentHint;
  }

  public getHint(): string {
    return this.currentHint;
  }

  public checkThreshold(
    timeLeftSeconds: number,
    totalTimeSeconds: number
  ): { shouldEmit: boolean; hint: string; revealedIndices: number[] } | null {
    if (totalTimeSeconds <= 0 || !this.secretWord) return null;

    const fraction = timeLeftSeconds / totalTimeSeconds;

    // 50% elapsed threshold (time left <= 0.50)
    if (fraction <= 0.5 && !this.revealed50) {
      this.revealed50 = true;
      const result = revealHintLetters(this.secretWord, this.currentHint, 0.25);
      this.currentHint = result.hint;
      return {
        shouldEmit: true,
        hint: this.currentHint,
        revealedIndices: result.revealedIndices,
      };
    }

    // 75% elapsed threshold (time left <= 0.25)
    if (fraction <= 0.25 && !this.revealed75) {
      this.revealed75 = true;
      const result = revealHintLetters(this.secretWord, this.currentHint, 0.45);
      this.currentHint = result.hint;
      return {
        shouldEmit: true,
        hint: this.currentHint,
        revealedIndices: result.revealedIndices,
      };
    }

    return null;
  }
}

