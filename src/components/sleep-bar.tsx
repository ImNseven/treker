"use client";

import { SleepSegment } from "@/lib/sleep";

interface SleepBarProps {
  segments: SleepSegment[];
  /** Total bar width in px (for SVG, optional). Leave undefined to use CSS %. */
  className?: string;
}

const TOTAL_MINUTES = 24 * 60; // 1440

// Hour labels shown beneath the bar
const HOUR_LABELS = [0, 6, 12, 18, 24];

export function SleepBar({ segments, className }: SleepBarProps) {
  return (
    <div className={className}>
      {/* Bar track */}
      <div className="relative h-5 rounded-full bg-[var(--treker-border)] overflow-hidden">
        {/* Gradient overlay segments */}
        {segments.map((seg, i) => {
          const left  = (seg.startMinute / TOTAL_MINUTES) * 100;
          const width = ((seg.endMinute - seg.startMinute) / TOTAL_MINUTES) * 100;
          return (
            <div
              key={i}
              className="absolute top-0 h-full rounded-full"
              style={{
                left:  `${left}%`,
                width: `${width}%`,
                background: "linear-gradient(90deg, #f97316, #ec4899)",
                minWidth: "2px",
              }}
            />
          );
        })}

        {/* Hour tick marks (at hours 1-23, inside bar, subtle) */}
        {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
          <div
            key={h}
            className="absolute top-0 h-full w-px bg-black/10 dark:bg-white/10"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}
      </div>

      {/* Hour labels */}
      <div className="relative flex justify-between mt-0.5 px-0">
        {HOUR_LABELS.map((h) => (
          <span
            key={h}
            className="text-[9px] text-[var(--treker-text-muted)] tnum"
            style={
              h === 0
                ? { marginLeft: 0 }
                : h === 24
                ? { marginRight: 0 }
                : undefined
            }
          >
            {h === 24 ? "0" : h}
          </span>
        ))}
      </div>
    </div>
  );
}
