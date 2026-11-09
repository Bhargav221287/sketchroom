import { describe, expect, it } from "vitest";
import { hexToRgb } from "../components/canvas/floodFill.js";

describe("Flood Fill Engine", () => {
  it("converts hex colors to RGB accurately", () => {
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
    expect(hexToRgb("#FFFFFF")).toEqual([255, 255, 255]);
    expect(hexToRgb("#EF4444")).toEqual([239, 68, 68]);
    expect(hexToRgb("#8B5CF6")).toEqual([139, 92, 246]);
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
  });
});

