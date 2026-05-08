import { describe, it, expect } from "vitest";
import {
  parseDurationToSeconds,
  formatDuration,
  calcPaceSecondsPerKm,
  formatPace,
} from "../running";

describe("parseDurationToSeconds", () => {
  it("plain integer string → minutes * 60", () => {
    expect(parseDurationToSeconds("45")).toBe(45 * 60);
  });

  it('"30" → 1800 seconds', () => {
    expect(parseDurationToSeconds("30")).toBe(1800);
  });

  it('"mm:ss" format → minutes * 60 + seconds', () => {
    expect(parseDurationToSeconds("30:00")).toBe(1800);
    expect(parseDurationToSeconds("1:30")).toBe(90);
    expect(parseDurationToSeconds("45:15")).toBe(45 * 60 + 15);
  });

  it('"h:mm:ss" format → total seconds', () => {
    expect(parseDurationToSeconds("1:30:00")).toBe(5400);
    expect(parseDurationToSeconds("0:05:30")).toBe(330);
  });

  it("invalid seconds >= 60 returns null", () => {
    expect(parseDurationToSeconds("1:60")).toBeNull();
    expect(parseDurationToSeconds("1:00:60")).toBeNull();
  });

  it("empty string returns null", () => {
    expect(parseDurationToSeconds("")).toBeNull();
  });

  it("non-numeric returns null", () => {
    expect(parseDurationToSeconds("abc")).toBeNull();
    expect(parseDurationToSeconds("1:ab")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("under 1 hour shows mm:ss", () => {
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("1 hour+ shows h:mm:ss", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("zero seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
  });
});

describe("calcPaceSecondsPerKm", () => {
  it("5km in 25min = 5:00/km = 300 sec/km", () => {
    expect(calcPaceSecondsPerKm(5, 25 * 60)).toBe(300);
  });

  it("10km in 50min = 5:00/km", () => {
    expect(calcPaceSecondsPerKm(10, 50 * 60)).toBe(300);
  });

  it("zero distance returns null", () => {
    expect(calcPaceSecondsPerKm(0, 300)).toBeNull();
  });

  it("negative distance returns null", () => {
    expect(calcPaceSecondsPerKm(-1, 300)).toBeNull();
  });

  it("rounds to nearest second", () => {
    // 1km in 61 sec → 61 sec/km exactly
    expect(calcPaceSecondsPerKm(1, 61)).toBe(61);
  });
});

describe("formatPace", () => {
  it("300 sec/km = '5:00 /км'", () => {
    expect(formatPace(300)).toBe("5:00 /км");
  });

  it("320 sec/km = '5:20 /км'", () => {
    expect(formatPace(320)).toBe("5:20 /км");
  });

  it("single digit seconds padded", () => {
    expect(formatPace(361)).toBe("6:01 /км");
  });
});
