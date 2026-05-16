"use client";

import { useState, useMemo } from "react";
import { Flame, Pencil } from "lucide-react";
import { DynamicIcon } from "@/components/dynamic-icon";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────
   Habit-tracker mockup — heatmap variants constrained to a single month.
   Visited at /mockup/habits — outside the auth-gated (app) group.
   All three sub-variants render side-by-side on identical sample data so
   you can pick the proportions that read best on phone.
   ──────────────────────────────────────────────────────────────────────── */

interface MockHabit {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const HABITS: MockHabit[] = [
  { id: "1", name: "Утренняя зарядка", icon: "Sun",        color: "#f97316" },
  { id: "2", name: "Зубы утро",        icon: "Smile",      color: "#0ea5e9" },
  { id: "3", name: "Зубы вечером",     icon: "Moon",       color: "#6366f1" },
  { id: "4", name: "Бег",              icon: "Footprints", color: "#ea580c" },
  { id: "5", name: "Бассейн",          icon: "Waves",      color: "#0284c7" },
];

// "Today" anchored so the mockup matches the user's reality
const REF_TODAY = new Date(2026, 4, 16); // 16 May 2026

function isDone(habitIdx: number, daysAgo: number): boolean {
  if (daysAgo < 0) return false;
  const threshold = [0.85, 0.95, 0.60, 0.40, 0.70][habitIdx] ?? 0.6;
  const seed = (habitIdx * 31 + daysAgo * 17 + daysAgo * daysAgo * 7) % 1000;
  return seed / 1000 < threshold;
}

function daysAgo(d: Date): number {
  const ms = REF_TODAY.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round(ms / 86_400_000);
}

function streakFor(idx: number): number {
  let s = 0;
  for (let i = 0; i < 365; i++) {
    if (isDone(i === 0 ? idx : idx, i)) s++; else break;
  }
  return s;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Hook: provides month state + computed grid
function useMonth(initialOffset = 0) {
  const [offset, setOffset] = useState(initialOffset);
  const ref = useMemo(() => new Date(REF_TODAY.getFullYear(), REF_TODAY.getMonth() + offset, 1), [offset]);
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const label = ref.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7; // 0..6, Mon-start
  return { offset, setOffset, year: y, month: m, label, daysInMonth, firstWeekday };
}

function monthStats(idx: number, year: number, month: number, daysInMonth: number) {
  let done = 0, total = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const ago = daysAgo(new Date(year, month, d));
    if (ago < 0) continue; // future days don't count
    total++;
    if (isDone(idx, ago)) done++;
  }
  return { done, total };
}

/* ─── Shared: month switcher ────────────────────────────────────────────── */

function MonthSwitcher({ label, onPrev, onNext, disableNext }: {
  label: string; onPrev(): void; onNext(): void; disableNext: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      <button onClick={onPrev} className="w-8 h-8 rounded-full border border-[var(--treker-border)] flex items-center justify-center text-[var(--treker-text-muted)] hover:text-[var(--treker-text)] transition-colors">‹</button>
      <span className="text-sm font-semibold capitalize min-w-[140px] text-center">{label}</span>
      <button onClick={onNext} disabled={disableNext} className="w-8 h-8 rounded-full border border-[var(--treker-border)] flex items-center justify-center text-[var(--treker-text-muted)] hover:text-[var(--treker-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">›</button>
    </div>
  );
}

/* ─── 3A: Calendar grid with day numbers ────────────────────────────────── */

function VariantA() {
  const M = useMonth();
  return (
    <div>
      <MonthSwitcher label={M.label} onPrev={() => M.setOffset(o => o - 1)} onNext={() => M.setOffset(o => o + 1)} disableNext={M.offset >= 0} />
      <div className="space-y-3">
        {HABITS.map((h, idx) => {
          const stats = monthStats(idx, M.year, M.month, M.daysInMonth);
          return (
            <div key={h.id} className="bg-[var(--treker-card)] rounded-2xl shadow-[var(--treker-shadow-card)] p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: h.color }}>
                  <DynamicIcon name={h.icon} size={14} />
                </div>
                <span className="flex-1 text-sm font-medium truncate">{h.name}</span>
                <span className="text-[11px] text-[var(--treker-text-muted)] tnum">
                  {stats.done}/{stats.total}
                </span>
                <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: h.color }}>
                  <Flame size={12} /> {streakFor(idx)}
                </span>
                <button className="text-[var(--treker-text-muted)] hover:text-[var(--treker-text)] p-0.5"><Pencil size={11} /></button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((wd) => (
                  <span key={wd} className="text-[9px] text-[var(--treker-text-muted)] text-center py-0.5">{wd}</span>
                ))}
                {Array.from({ length: M.firstWeekday }, (_, i) => <div key={`p-${i}`} />)}
                {Array.from({ length: M.daysInMonth }, (_, i) => i + 1).map((d) => {
                  const ago = daysAgo(new Date(M.year, M.month, d));
                  const isFuture = ago < 0;
                  const isToday = ago === 0;
                  const done = !isFuture && isDone(idx, ago);
                  return (
                    <div
                      key={d}
                      className={cn(
                        "aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-all",
                        isFuture && "opacity-30 text-[var(--treker-text-muted)]",
                        !isFuture && done && "text-white",
                        !isFuture && !done && !isToday && "bg-[var(--treker-border)]/40 text-[var(--treker-text-muted)]",
                        isToday && "ring-2 ring-[var(--treker-accent)] ring-offset-1 ring-offset-[var(--treker-card)]"
                      )}
                      style={done ? { backgroundColor: h.color } : {}}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── 3B: Pure heatmap, no day numbers ──────────────────────────────────── */

function VariantB() {
  const M = useMonth();
  return (
    <div>
      <MonthSwitcher label={M.label} onPrev={() => M.setOffset(o => o - 1)} onNext={() => M.setOffset(o => o + 1)} disableNext={M.offset >= 0} />
      <div className="space-y-2">
        {HABITS.map((h, idx) => {
          const stats = monthStats(idx, M.year, M.month, M.daysInMonth);
          return (
            <div key={h.id} className="bg-[var(--treker-card)] rounded-xl shadow-[var(--treker-shadow-card)] p-3 flex items-center gap-3">
              <div className="flex flex-col items-center gap-1 shrink-0 w-14">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: h.color }}>
                  <DynamicIcon name={h.icon} size={16} />
                </div>
                <span className="flex items-center gap-0.5 text-[11px] font-semibold tnum" style={{ color: h.color }}>
                  <Flame size={10} /> {streakFor(idx)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs font-medium truncate">{h.name}</span>
                  <span className="text-[10px] text-[var(--treker-text-muted)] tnum shrink-0 ml-2">
                    {stats.done}/{stats.total} ({stats.total > 0 ? Math.round(100 * stats.done / stats.total) : 0}%)
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-[3px]">
                  {Array.from({ length: M.firstWeekday }, (_, i) => <div key={`p-${i}`} className="aspect-square" />)}
                  {Array.from({ length: M.daysInMonth }, (_, i) => i + 1).map((d) => {
                    const ago = daysAgo(new Date(M.year, M.month, d));
                    const isFuture = ago < 0;
                    const isToday = ago === 0;
                    const done = !isFuture && isDone(idx, ago);
                    return (
                      <div
                        key={d}
                        className={cn(
                          "aspect-square rounded-[3px] transition-all",
                          isToday && "ring-1 ring-[var(--treker-accent)] ring-offset-1 ring-offset-[var(--treker-card)]"
                        )}
                        style={{
                          backgroundColor: isFuture
                            ? "var(--treker-border)"
                            : done
                              ? h.color
                              : "var(--treker-border)",
                          opacity: isFuture ? 0.25 : done ? 1 : 0.5,
                        }}
                        title={`${d}.${M.month + 1}: ${done ? "✓" : isFuture ? "—" : "пропуск"}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── 3C: Compact grid with day numbers, 2-up on wider screens ──────────── */

function VariantC() {
  const M = useMonth();
  return (
    <div>
      <MonthSwitcher label={M.label} onPrev={() => M.setOffset(o => o - 1)} onNext={() => M.setOffset(o => o + 1)} disableNext={M.offset >= 0} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {HABITS.map((h, idx) => {
          const stats = monthStats(idx, M.year, M.month, M.daysInMonth);
          return (
            <div key={h.id} className="bg-[var(--treker-card)] rounded-xl shadow-[var(--treker-shadow-card)] p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0" style={{ backgroundColor: h.color }}>
                  <DynamicIcon name={h.icon} size={13} />
                </div>
                <span className="flex-1 text-xs font-semibold truncate">{h.name}</span>
                <span className="flex items-center gap-0.5 text-[11px] font-semibold tnum" style={{ color: h.color }}>
                  <Flame size={11} /> {streakFor(idx)}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-0.5 mb-2">
                {WEEKDAYS.map((wd) => (
                  <span key={wd} className="text-[8px] text-[var(--treker-text-muted)] text-center">{wd}</span>
                ))}
                {Array.from({ length: M.firstWeekday }, (_, i) => <div key={`p-${i}`} />)}
                {Array.from({ length: M.daysInMonth }, (_, i) => i + 1).map((d) => {
                  const ago = daysAgo(new Date(M.year, M.month, d));
                  const isFuture = ago < 0;
                  const isToday = ago === 0;
                  const done = !isFuture && isDone(idx, ago);
                  return (
                    <div
                      key={d}
                      className={cn(
                        "aspect-square rounded-[4px] flex items-center justify-center text-[9px] transition-all",
                        isFuture && "opacity-30 text-[var(--treker-text-muted)]",
                        !isFuture && done && "text-white font-medium",
                        !isFuture && !done && "bg-[var(--treker-border)]/40 text-[var(--treker-text-muted)]",
                        isToday && "ring-1 ring-[var(--treker-accent)]"
                      )}
                      style={done ? { backgroundColor: h.color } : {}}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] text-[var(--treker-text-muted)] pt-1 border-t border-[var(--treker-border)]">
                <span>выполнено</span>
                <span className="font-semibold tnum text-[var(--treker-text)]">
                  {stats.done}/{stats.total} ({stats.total > 0 ? Math.round(100 * stats.done / stats.total) : 0}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */

const VARIANTS = [
  {
    id: "A",
    title: "Календарь с цифрами дней",
    summary: "Полная сетка 7×6 с цифрами в каждой ячейке. Видно конкретные числа, форма читается как настоящий календарь. Карточки длинные сверху вниз — на телефоне всё в один столбец.",
    component: VariantA,
  },
  {
    id: "B",
    title: "Heatmap-полоска без цифр",
    summary: "Иконка + стрик слева, маленькая месячная heatmap справа в 7 столбцов. Самое компактное по вертикали — все 5 привычек влезают в одно окно даже на телефоне. Цифр дней нет, чистый паттерн.",
    component: VariantB,
  },
  {
    id: "C",
    title: "Мини-карточки 2 в ряд",
    summary: "Маленький календарь с числами, но компактный. На телефоне — 1 в ряд, на десктопе — 2 в ряд. Под каждой карточкой строка статистики (done/total + %).",
    component: VariantC,
  },
];

export default function HabitsMockupPage() {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[var(--treker-bg)] text-[var(--treker-text)] p-4 md:p-6">
      <header className="max-w-md mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-1">Привычки 3 — варианты heatmap</h1>
        <p className="text-sm text-[var(--treker-text-muted)] mb-4">
          Все три варианта в пределах месяца, заточены под телефон (~360 px).
          Месяц переключается. Скажи букву понравившегося.
        </p>
        <div className="flex gap-2 flex-wrap">
          {VARIANTS.map((v) => (
            <button
              key={v.id}
              onClick={() => setPicked(v.id === picked ? null : v.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all",
                picked === v.id
                  ? "bg-[var(--treker-accent)] text-white border-[var(--treker-accent)] shadow-md scale-105"
                  : "bg-[var(--treker-card)] border-[var(--treker-border)] hover:border-[var(--treker-accent)]/40"
              )}
            >
              {v.id}. {v.title}
            </button>
          ))}
          {picked && (
            <button
              onClick={() => setPicked(null)}
              className="px-3 py-1.5 rounded-lg text-sm text-[var(--treker-text-muted)] hover:text-[var(--treker-text)]"
            >
              ← все
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto space-y-10">
        {VARIANTS
          .filter(v => picked === null || picked === v.id)
          .map((v) => {
            const Comp = v.component;
            return (
              <section key={v.id}>
                <div className="flex items-baseline gap-3 mb-3 border-b border-[var(--treker-border)] pb-2">
                  <span className="text-3xl font-bold text-[var(--treker-accent)]">{v.id}</span>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold">{v.title}</h2>
                    <p className="text-[11px] text-[var(--treker-text-muted)] mt-0.5 leading-tight">{v.summary}</p>
                  </div>
                </div>
                <Comp />
              </section>
            );
          })}
      </main>

      <footer className="max-w-md mx-auto mt-12 text-center text-xs text-[var(--treker-text-muted)]">
        Контейнер на странице ограничен max-w-md (~448 px) — это и есть «как на телефоне».
      </footer>
    </div>
  );
}
