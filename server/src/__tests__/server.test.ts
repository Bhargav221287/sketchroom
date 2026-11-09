import { describe, expect, it } from "vitest";
import { calculateDrawerScore, calculateGuesserScore } from "../game/Scoring.js";
import { OpLog } from "../canvas/OpLog.js";
import { HintEngine } from "../game/HintEngine.js";
import { wordBank } from "../game/WordBank.js";
import { CanvasOp } from "@sketchroom/shared";

describe("Scoring Engine", () => {
  it("calculates guesser score with time decay and bonus", () => {
    // Guesser at 100% time left
    const maxScore = calculateGuesserScore(80, 80, true);
    expect(maxScore).toBe(550); // 500 + 50 first guess bonus

    // Guesser without bonus
    const normalMax = calculateGuesserScore(80, 80, false);
    expect(normalMax).toBe(500);

    // Guesser at 50% time left
    const midScore = calculateGuesserScore(40, 80, false);
    expect(midScore).toBe(300); // 100 + 400 * 0.5

    // Guesser at 0s time left
    const minScore = calculateGuesserScore(0, 80, false);
    expect(minScore).toBe(100);
  });

  it("calculates drawer score based on correct guessers count", () => {
    expect(calculateDrawerScore(0, 4)).toBe(0);
    expect(calculateDrawerScore(1, 4)).toBe(75);
    expect(calculateDrawerScore(2, 4)).toBe(150);

    // All guessed bonus
    const allGuessed = calculateDrawerScore(4, 4);
    expect(allGuessed).toBe(4 * 75 + 100); // 400
  });
});

describe("Canvas OpLog", () => {
  it("supports add, undo, redo and clear", () => {
    const log = new OpLog();
    expect(log.getOps().length).toBe(0);

    const op1: CanvasOp = {
      type: "stroke",
      id: "1",
      tool: "brush",
      color: "#000",
      size: 5,
      opacity: 1,
      points: [{ x: 0.1, y: 0.1 }],
    };
    const op2: CanvasOp = {
      type: "stroke",
      id: "2",
      tool: "brush",
      color: "#f00",
      size: 5,
      opacity: 1,
      points: [{ x: 0.2, y: 0.2 }],
    };

    log.addOp(op1);
    log.addOp(op2);
    expect(log.getOps().length).toBe(2);

    const undone = log.undo();
    expect(undone?.id).toBe("2");
    expect(log.getOps().length).toBe(1);

    const redone = log.redo();
    expect(redone?.id).toBe("2");
    expect(log.getOps().length).toBe(2);

    log.clear();
    expect(log.getOps().length).toBe(3);
    expect(log.getOps()[2].type).toBe("clear");
  });
});

describe("HintEngine", () => {
  it("initializes and triggers hints at 50% and 75% thresholds", () => {
    const engine = new HintEngine();
    const hint = engine.initialize("helicopter");
    expect(hint).toBe("_ _ _ _ _ _ _ _ _ _");

    // Before 50% (e.g. 60s of 80s = 75% time left)
    const early = engine.checkThreshold(60, 80);
    expect(early).toBeNull();

    // Crossing 50% (40s of 80s)
    const mid = engine.checkThreshold(40, 80);
    expect(mid).not.toBeNull();
    expect(mid?.shouldEmit).toBe(true);
    expect(mid?.revealedIndices.length).toBeGreaterThan(0);

    // Second check at same range shouldn't duplicate
    const dup = engine.checkThreshold(39, 80);
    expect(dup).toBeNull();

    // Crossing 75% (20s of 80s)
    const late = engine.checkThreshold(20, 80);
    expect(late).not.toBeNull();
    expect(late?.shouldEmit).toBe(true);
  });
});

describe("WordBank", () => {
  it("picks random words from selected categories", () => {
    const words = wordBank.getRandomWords(["animals", "food"], ["spaceship"], 3);
    expect(words.length).toBe(3);
    expect(new Set(words).size).toBe(3); // distinct
  });
});
