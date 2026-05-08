import { describe, it, expect } from "vitest";
import { splitSleepEntry, sleepDurationMinutes, formatSleepDuration } from "../sleep";

function d(dateStr: string): Date {
  return new Date(dateStr);
}

describe("splitSleepEntry", () => {
  it("same-day sleep returns one segment", () => {
    const entry = { startAt: d("2024-01-15T22:00:00"), endAt: d("2024-01-15T23:30:00") };
    const segments = splitSleepEntry(entry);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({
      dayKey: "2024-01-15",
      startMinute: 22 * 60,
      endMinute: 23 * 60 + 30,
    });
  });

  it("midnight-crossing sleep returns two segments", () => {
    const entry = { startAt: d("2024-01-15T23:30:00"), endAt: d("2024-01-16T07:15:00") };
    const segments = splitSleepEntry(entry);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({
      dayKey: "2024-01-15",
      startMinute: 23 * 60 + 30,
      endMinute: 24 * 60,
    });
    expect(segments[1]).toEqual({
      dayKey: "2024-01-16",
      startMinute: 0,
      endMinute: 7 * 60 + 15,
    });
  });

  it("multi-day sleep (3 days) returns three segments", () => {
    const entry = { startAt: d("2024-01-14T22:00:00"), endAt: d("2024-01-16T06:00:00") };
    const segments = splitSleepEntry(entry);
    expect(segments).toHaveLength(3);
    expect(segments[0].dayKey).toBe("2024-01-14");
    expect(segments[0].startMinute).toBe(22 * 60);
    expect(segments[0].endMinute).toBe(24 * 60);
    expect(segments[1].dayKey).toBe("2024-01-15");
    expect(segments[1].startMinute).toBe(0);
    expect(segments[1].endMinute).toBe(24 * 60);
    expect(segments[2].dayKey).toBe("2024-01-16");
    expect(segments[2].startMinute).toBe(0);
    expect(segments[2].endMinute).toBe(6 * 60);
  });

  it("exactly midnight start returns single segment starting at minute 0", () => {
    const entry = { startAt: d("2024-01-15T00:00:00"), endAt: d("2024-01-15T08:00:00") };
    const segments = splitSleepEntry(entry);
    expect(segments).toHaveLength(1);
    expect(segments[0].startMinute).toBe(0);
    expect(segments[0].endMinute).toBe(8 * 60);
  });

  it("zero-duration sleep (same start and end) returns segment with equal minutes", () => {
    const entry = { startAt: d("2024-01-15T02:00:00"), endAt: d("2024-01-15T02:00:00") };
    const segments = splitSleepEntry(entry);
    expect(segments).toHaveLength(1);
    expect(segments[0].startMinute).toBe(segments[0].endMinute);
  });
});

describe("sleepDurationMinutes", () => {
  it("calculates duration correctly", () => {
    const entry = { startAt: d("2024-01-15T23:00:00"), endAt: d("2024-01-16T07:30:00") };
    expect(sleepDurationMinutes(entry)).toBe(8 * 60 + 30);
  });

  it("same-day 90 min sleep", () => {
    const entry = { startAt: d("2024-01-15T14:00:00"), endAt: d("2024-01-15T15:30:00") };
    expect(sleepDurationMinutes(entry)).toBe(90);
  });
});

describe("formatSleepDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatSleepDuration(8 * 60 + 30)).toBe("8ч 30м");
  });

  it("formats exact hours", () => {
    expect(formatSleepDuration(7 * 60)).toBe("7ч 0м");
  });

  it("formats less than an hour", () => {
    expect(formatSleepDuration(45)).toBe("0ч 45м");
  });

  it("formats zero", () => {
    expect(formatSleepDuration(0)).toBe("0ч 0м");
  });
});
