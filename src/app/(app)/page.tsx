"use client";

import { useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { SleepBar } from "@/components/sleep-bar";
import { DynamicIcon } from "@/components/dynamic-icon";
import { splitSleepEntry, sleepDurationMinutes, formatSleepDuration } from "@/lib/sleep";
import { calcPaceSecondsPerKm, formatPace, formatDuration } from "@/lib/running";
import { calcStreak } from "@/lib/habits";
import type { Habit, HabitLog, SleepEntry } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Run {
  id: string;
  occurredOn: string;
  distanceKm: number | string;
  durationSec: number;
  note: string | null;
}

interface WorkDay {
  id: string;
  day: string;
  hours: number | string;
  description: string | null;
}

export default function DashboardPage() {
  const today = new Date();
  const todayKey = toDateKey(today);
  const year  = today.getFullYear();
  const month = today.getMonth() + 1;

  // Fetch all data
  const { data: habits   = [] } = useSWR<Habit[]>("/api/habits", fetcher);
  const { data: logs     = [] } = useSWR<HabitLog[]>(`/api/habits/log?year=${year}&month=${month}`, fetcher);
  const { data: sleepArr = [] } = useSWR<SleepEntry[]>("/api/sleep", fetcher);
  const { data: runs     = [] } = useSWR<Run[]>(`/api/running?year=${year}&month=${month}`, fetcher);
  const { data: workDays = [] } = useSWR<WorkDay[]>(`/api/work?year=${year}&month=${month}`, fetcher);

  // ── Habits ───────────────────────────────────────────────────────────────
  const todayLogSet = new Set(
    logs.filter(l => toDateKey(new Date(l.day)) === todayKey).map(l => l.habitId)
  );
  const doneCount = habits.filter(h => todayLogSet.has(h.id)).length;

  // ── Sleep ────────────────────────────────────────────────────────────────
  const lastSleep = sleepArr[0] ?? null;
  const lastSleepSegments = useMemo(() => {
    if (!lastSleep) return [];
    const startAt = new Date(lastSleep.startAt);
    const endAt   = new Date(lastSleep.endAt);
    const startDay = toDateKey(startAt);
    return splitSleepEntry({ startAt, endAt }).filter(s => s.dayKey === startDay);
  }, [lastSleep]);
  const lastSleepDuration = lastSleep
    ? sleepDurationMinutes({ startAt: new Date(lastSleep.startAt), endAt: new Date(lastSleep.endAt) })
    : 0;

  // ── Running ──────────────────────────────────────────────────────────────
  const lastRun = runs[0] ?? null;
  const runStats = useMemo(() => {
    const totalKm  = runs.reduce((s, r) => s + Number(r.distanceKm), 0);
    const totalSec = runs.reduce((s, r) => s + r.durationSec, 0);
    return { totalKm, totalSec };
  }, [runs]);

  // ── Work ─────────────────────────────────────────────────────────────────
  const totalWorkHours = workDays.reduce((s, w) => s + Number(w.hours), 0);
  const todayWork = workDays.find(w => w.day.slice(0, 10) === todayKey);

  const greeting = () => {
    const h = today.getHours();
    if (h < 6)  return "Доброй ночи";
    if (h < 12) return "Доброе утро";
    if (h < 18) return "Добрый день";
    return "Добрый вечер";
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-xs text-[var(--treker-text-muted)]">
          {today.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-2xl font-bold text-[var(--treker-text)]">{greeting()} 👋</h1>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">

        {/* Habits widget — full width */}
        <Link
          href="/habits"
          className="col-span-2 bg-[var(--treker-card)] rounded-2xl p-4 border border-[var(--treker-border)] hover:border-[var(--treker-accent)]/50 transition-colors block"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[var(--treker-text-muted)] font-medium">Привычки сегодня</p>
            <span className="text-xs font-bold text-[var(--treker-accent)] tnum">
              {doneCount}/{habits.length}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {habits.slice(0, 8).map((h) => {
              const done = todayLogSet.has(h.id);
              return (
                <div
                  key={h.id}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={done
                    ? { background: `linear-gradient(135deg, ${h.color}, ${h.color}cc)` }
                    : { background: "var(--treker-border)" }
                  }
                >
                  <DynamicIcon name={h.icon} size={16} style={{ color: done ? "#fff" : h.color }} />
                </div>
              );
            })}
          </div>
          {habits.length > 0 && (
            <div className="mt-2 h-1.5 rounded-full bg-[var(--treker-border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--treker-accent)] transition-all"
                style={{ width: `${habits.length > 0 ? (doneCount / habits.length) * 100 : 0}%` }}
              />
            </div>
          )}
        </Link>

        {/* Sleep widget */}
        <Link
          href="/sleep"
          className="col-span-2 bg-[var(--treker-card)] rounded-2xl p-4 border border-[var(--treker-border)] hover:border-[var(--treker-accent)]/50 transition-colors block"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[var(--treker-text-muted)] font-medium">Последний сон</p>
            {lastSleepDuration > 0 && (
              <span className="text-sm font-bold text-[var(--treker-text)] tnum">
                {formatSleepDuration(lastSleepDuration)}
              </span>
            )}
          </div>
          {lastSleepSegments.length > 0 ? (
            <SleepBar segments={lastSleepSegments} />
          ) : (
            <p className="text-xs text-[var(--treker-text-muted)]">Нет данных</p>
          )}
        </Link>

        {/* Running widget */}
        <Link
          href="/running"
          className="bg-[var(--treker-card)] rounded-2xl p-4 border border-[var(--treker-border)] hover:border-[var(--treker-accent)]/50 transition-colors block"
        >
          <p className="text-xs text-[var(--treker-text-muted)] font-medium mb-2">Бег этот месяц</p>
          <p className="text-2xl font-bold text-[var(--treker-text)] tnum">
            {runStats.totalKm.toFixed(1)}
            <span className="text-sm font-normal ml-1">км</span>
          </p>
          {lastRun && (
            <div className="mt-2 text-xs text-[var(--treker-text-muted)]">
              <p className="tnum">
                Последняя: {Number(lastRun.distanceKm).toFixed(2)} км •{" "}
                {formatDuration(lastRun.durationSec)}
              </p>
              {(() => {
                const p = calcPaceSecondsPerKm(Number(lastRun.distanceKm), lastRun.durationSec);
                return p ? <p className="tnum">{formatPace(p)}</p> : null;
              })()}
            </div>
          )}
          {runs.length === 0 && (
            <p className="text-xs text-[var(--treker-text-muted)] mt-1">Нет пробежек</p>
          )}
        </Link>

        {/* Work widget */}
        <Link
          href="/work"
          className="bg-[var(--treker-card)] rounded-2xl p-4 border border-[var(--treker-border)] hover:border-[var(--treker-accent)]/50 transition-colors block"
        >
          <p className="text-xs text-[var(--treker-text-muted)] font-medium mb-2">Работа этот месяц</p>
          <p className="text-2xl font-bold text-[var(--treker-text)] tnum">
            {totalWorkHours.toFixed(0)}
            <span className="text-sm font-normal ml-1">ч</span>
          </p>
          {todayWork ? (
            <p className="mt-2 text-xs text-[var(--treker-text-muted)] tnum">
              Сегодня: {Number(todayWork.hours).toFixed(1)} ч
              {todayWork.description && ` · ${todayWork.description}`}
            </p>
          ) : (
            <p className="mt-2 text-xs text-[var(--treker-text-muted)]">Сегодня не отмечено</p>
          )}
        </Link>

      </div>
    </div>
  );
}
