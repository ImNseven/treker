import { describe, it, expect } from "vitest";
import { calcStreak } from "../habits";

describe("calcStreak", () => {
  const today = new Date("2026-05-07T12:00:00");

  it("returns 0 when no logs", () => {
    expect(calcStreak([], today)).toBe(0);
  });

  it("returns 1 when only today logged", () => {
    expect(calcStreak([new Date("2026-05-07")], today)).toBe(1);
  });

  it("counts consecutive days ending today", () => {
    const days = ["2026-05-05", "2026-05-06", "2026-05-07"].map(d => new Date(d));
    expect(calcStreak(days, today)).toBe(3);
  });

  it("stops at gap", () => {
    const days = ["2026-05-04", "2026-05-06", "2026-05-07"].map(d => new Date(d));
    expect(calcStreak(days, today)).toBe(2);
  });

  it("returns streak ending yesterday if today not logged", () => {
    const days = ["2026-05-05", "2026-05-06"].map(d => new Date(d));
    expect(calcStreak(days, today)).toBe(2);
  });

  it("returns 0 if only old days logged", () => {
    const days = ["2026-05-01", "2026-05-02"].map(d => new Date(d));
    expect(calcStreak(days, today)).toBe(0);
  });
});
