/**
 * Parse a duration string like "HH:MM", "MM:SS", or plain minutes into seconds.
 * Accepts:
 *   "45"      → 45 minutes → 2700 seconds
 *   "1:30"    → 1 hour 30 min → 5400 seconds  (or 1 min 30 sec if < "60:00" context?)
 *
 * Convention used here:
 *   "H:MM:SS" → hours, minutes, seconds
 *   "MM:SS"   → minutes and seconds (two segments)
 *   "SS" / plain number → seconds
 *
 * But for running we work in minutes:seconds mostly.
 * We'll accept "h:mm:ss", "mm:ss", or plain integer minutes.
 */
export function parseDurationToSeconds(input: string): number | null {
  const s = input.trim();
  if (!s) return null;

  // Plain number → treat as minutes
  if (/^\d+$/.test(s)) {
    const mins = parseInt(s, 10);
    return isNaN(mins) ? null : mins * 60;
  }

  const parts = s.split(":").map(Number);
  if (parts.some(isNaN)) return null;

  if (parts.length === 2) {
    // mm:ss
    const [mm, ss] = parts;
    if (ss < 0 || ss >= 60) return null;
    return mm * 60 + ss;
  }

  if (parts.length === 3) {
    // h:mm:ss
    const [h, mm, ss] = parts;
    if (mm < 0 || mm >= 60 || ss < 0 || ss >= 60) return null;
    return h * 3600 + mm * 60 + ss;
  }

  return null;
}

/**
 * Format seconds as "H:MM:SS" (omits hours if < 3600).
 * e.g. 3661 → "1:01:01", 125 → "2:05"
 */
export function formatDuration(seconds: number): string {
  const h  = Math.floor(seconds / 3600);
  const m  = Math.floor((seconds % 3600) / 60);
  const s  = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/**
 * Calculate pace in seconds per km.
 * Returns null if distanceKm is 0 or negative.
 */
export function calcPaceSecondsPerKm(distanceKm: number, durationSeconds: number): number | null {
  if (distanceKm <= 0 || durationSeconds <= 0) return null;
  return Math.round(durationSeconds / distanceKm);
}

/**
 * Format pace as "M:SS /km", e.g. 320 → "5:20 /км"
 */
export function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = secondsPerKm % 60;
  return `${m}:${String(s).padStart(2, "0")} /км`;
}
