export function calcStreak(logDays: Date[], today: Date): number {
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const set = new Set(logDays.map(toKey));
  const todayKey = toKey(today);
  const yesterday = new Date(today.getTime() - 86_400_000);
  const yesterdayKey = toKey(yesterday);

  // Streak must end on today or yesterday
  if (!set.has(todayKey) && !set.has(yesterdayKey)) return 0;

  let cursor = set.has(todayKey) ? new Date(today) : new Date(yesterday);
  let streak = 0;

  while (set.has(toKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  return streak;
}
