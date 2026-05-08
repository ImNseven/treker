export interface SleepSegment {
  dayKey: string;        // "YYYY-MM-DD"
  startMinute: number;   // minutes from midnight [0, 1440]
  endMinute: number;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function minutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function splitSleepEntry(entry: { startAt: Date; endAt: Date }): SleepSegment[] {
  const { startAt, endAt } = entry;
  const startDay = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate());
  const endDay   = new Date(endAt.getFullYear(),   endAt.getMonth(),   endAt.getDate());

  if (startDay.getTime() === endDay.getTime()) {
    return [{
      dayKey:      dateKey(startAt),
      startMinute: minutesFromMidnight(startAt),
      endMinute:   minutesFromMidnight(endAt),
    }];
  }

  const segments: SleepSegment[] = [];
  let cursor = new Date(startDay);

  while (cursor <= endDay) {
    const key    = dateKey(cursor);
    const isFirst = cursor.getTime() === startDay.getTime();
    const isLast  = cursor.getTime() === endDay.getTime();

    segments.push({
      dayKey:      key,
      startMinute: isFirst ? minutesFromMidnight(startAt) : 0,
      endMinute:   isLast  ? minutesFromMidnight(endAt)   : 24 * 60,
    });

    cursor = new Date(cursor.getTime() + 86_400_000);
  }

  return segments;
}

export function sleepDurationMinutes(entry: { startAt: Date; endAt: Date }): number {
  return Math.round((entry.endAt.getTime() - entry.startAt.getTime()) / 60_000);
}

export function formatSleepDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}ч ${m}м`;
}
