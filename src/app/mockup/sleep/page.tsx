"use client";

import { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import {
  splitSleepEntry,
  sleepDurationMinutes,
  formatSleepDuration,
  type SleepSegment,
} from "@/lib/sleep";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────
   Mockup: tighter vertical packing of sleep day rows so the bars read as
   one continuous strip you can scan top-to-bottom. /mockup/sleep
   ──────────────────────────────────────────────────────────────────────── */

interface SampleEntry { id: string; start: string; end: string; }
const SAMPLE: SampleEntry[] = [
  { id: "1", start: "2026-05-15T23:30:00", end: "2026-05-16T06:50:00" },
  { id: "2", start: "2026-05-14T22:45:00", end: "2026-05-15T06:30:00" },
  { id: "3", start: "2026-05-14T00:15:00", end: "2026-05-14T07:30:00" }, // late
  { id: "4", start: "2026-05-12T23:10:00", end: "2026-05-13T07:40:00" },
  // May 12 = no sleep tracked (gap)
  { id: "5", start: "2026-05-10T22:00:00", end: "2026-05-11T07:15:00" },
  { id: "6", start: "2026-05-09T23:30:00", end: "2026-05-10T07:00:00" },
  { id: "7", start: "2026-05-08T22:50:00", end: "2026-05-09T07:00:00" },
];

// ── Build day rows like the real page does ──────────────────────────────
interface DayRowEntry {
  id: string;
  startAt: Date;
  endAt: Date;
  segments: SleepSegment[];
  totalMinutes: number;
}
interface DayRow {
  dayKey: string;
  date: Date;
  entries: DayRowEntry[];   // entries that started this day
  daySegments: SleepSegment[];
  totalMinutes: number;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toLocalTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildRows(entries: SampleEntry[]): DayRow[] {
  const map = new Map<string, DayRow>();
  function ensure(key: string, date: Date): DayRow {
    let r = map.get(key);
    if (!r) {
      r = { dayKey: key, date, entries: [], daySegments: [], totalMinutes: 0 };
      map.set(key, r);
    }
    return r;
  }
  for (const e of entries) {
    const startAt = new Date(e.start);
    const endAt   = new Date(e.end);
    const segs = splitSleepEntry({ startAt, endAt });
    const total = sleepDurationMinutes({ startAt, endAt });
    for (const seg of segs) {
      const [yy, mm, dd] = seg.dayKey.split("-").map(Number);
      const row = ensure(seg.dayKey, new Date(yy, mm - 1, dd));
      row.daySegments.push(seg);
      row.totalMinutes += seg.endMinute - seg.startMinute;
    }
    const startKey = dayKey(startAt);
    const startRow = map.get(startKey)!;
    startRow.entries.push({ id: e.id, startAt, endAt, segments: segs, totalMinutes: total });
  }
  return Array.from(map.values()).sort((a, b) => b.dayKey.localeCompare(a.dayKey));
}

const ROWS = buildRows(SAMPLE);

// ── Reusable 24h bar primitives at three densities ──────────────────────

function Bar({
  segments,
  height = "h-5",
  showHourLabels = true,
}: {
  segments: SleepSegment[];
  height?: string;
  showHourLabels?: boolean;
}) {
  return (
    <div>
      <div className={cn("relative rounded-full bg-[var(--treker-border)] overflow-hidden", height)}>
        {segments.map((s, i) => (
          <div
            key={i}
            className="absolute top-0 h-full rounded-full"
            style={{
              left:  `${(s.startMinute / 1440) * 100}%`,
              width: `${((s.endMinute - s.startMinute) / 1440) * 100}%`,
              background: "linear-gradient(90deg, #f97316, #ec4899)",
              minWidth: "2px",
            }}
          />
        ))}
        {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
          <div key={h} className="absolute top-0 h-full w-px bg-black/10 dark:bg-white/10" style={{ left: `${(h / 24) * 100}%` }} />
        ))}
      </div>
      {showHourLabels && (
        <div className="relative flex justify-between mt-0.5">
          {[0, 6, 12, 18, 24].map((h) => (
            <span key={h} className="text-[9px] text-[var(--treker-text-muted)] tnum">{h === 24 ? "0" : h}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDayLabel(d: Date) {
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
}

/* ─── Variant A: Slim cards, tight stack ───────────────────────────────── */

function VariantA() {
  return (
    <div className="space-y-1.5">
      {ROWS.map((row) => (
        <div key={row.dayKey} className="bg-[var(--treker-card)] rounded-lg border border-[var(--treker-border)] px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[var(--treker-text)]">{formatDayLabel(row.date)}</span>
            <span className="text-[11px] text-[var(--treker-text-muted)] tnum">
              {row.totalMinutes > 0 ? formatSleepDuration(row.totalMinutes) : "—"}
            </span>
          </div>
          <Bar segments={row.daySegments} height="h-4" showHourLabels={false} />
          {row.entries.length > 0 && (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[10px] text-[var(--treker-text-muted)] tnum">
              {row.entries.map((e) => {
                const crosses = dayKey(e.startAt) !== dayKey(e.endAt);
                return (
                  <span key={e.id} className="inline-flex items-center gap-1">
                    {toLocalTimeStr(e.startAt)}—{toLocalTimeStr(e.endAt)}{crosses && "+1д"}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Variant B: One-line strip per day, expand for details ─────────────── */

function VariantB() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="bg-[var(--treker-card)] rounded-xl border border-[var(--treker-border)] divide-y divide-[var(--treker-border)] overflow-hidden">
      {ROWS.map((row) => {
        const isOpen = expanded === row.dayKey;
        return (
          <div key={row.dayKey}>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : row.dayKey)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[var(--treker-border)]/30 transition-colors text-left"
            >
              {isOpen ? <ChevronDown size={12} className="text-[var(--treker-text-muted)] shrink-0" /> : <ChevronRight size={12} className="text-[var(--treker-text-muted)] shrink-0" />}
              <span className="text-[11px] font-medium w-16 shrink-0 tnum">{row.date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}</span>
              <div className="flex-1 min-w-0">
                <Bar segments={row.daySegments} height="h-3.5" showHourLabels={false} />
              </div>
              <span className="text-[11px] text-[var(--treker-text)] tnum w-12 text-right shrink-0">
                {row.totalMinutes > 0 ? formatSleepDuration(row.totalMinutes) : "—"}
              </span>
            </button>
            {isOpen && row.entries.length > 0 && (
              <div className="px-10 pb-2 pt-1 space-y-1 bg-[var(--treker-border)]/20">
                {row.entries.map((e) => {
                  const crosses = dayKey(e.startAt) !== dayKey(e.endAt);
                  return (
                    <div key={e.id} className="flex items-center text-[11px] gap-3">
                      <span className="tnum text-[var(--treker-text-muted)]">
                        {toLocalTimeStr(e.startAt)} — {toLocalTimeStr(e.endAt)}{crosses && " (+1д)"}
                      </span>
                      <span className="text-[var(--treker-text)] tnum">{formatSleepDuration(e.totalMinutes)}</span>
                      <button className="ml-auto text-[var(--treker-text-muted)] hover:text-[var(--treker-text)]"><Pencil size={10} /></button>
                      <button className="text-[var(--treker-text-muted)] hover:text-[var(--treker-expense)]"><Trash2 size={10} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Variant C: Pure timeline — bars almost touching, no cards ─────────── */

function VariantC() {
  // Hour grid header on top of the whole stack
  return (
    <div className="bg-[var(--treker-card)] rounded-xl border border-[var(--treker-border)] p-3">
      {/* Top hour scale */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-14 shrink-0" />
        <div className="flex-1 flex justify-between text-[9px] text-[var(--treker-text-muted)] tnum px-px">
          {[0, 6, 12, 18, 24].map((h) => (
            <span key={h}>{h === 24 ? "0" : h}</span>
          ))}
        </div>
        <div className="w-12 shrink-0 text-right text-[10px] text-[var(--treker-text-muted)]">часов</div>
      </div>

      <div className="space-y-[2px]">
        {ROWS.map((row) => (
          <div key={row.dayKey} className="flex items-center gap-2 group">
            <span className="w-14 shrink-0 text-[11px] text-[var(--treker-text-muted)] truncate">
              {row.date.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" })}
            </span>
            <div className="flex-1">
              <Bar segments={row.daySegments} height="h-3" showHourLabels={false} />
            </div>
            <span className="w-12 shrink-0 text-right text-[11px] tnum text-[var(--treker-text)]">
              {row.totalMinutes > 0 ? formatSleepDuration(row.totalMinutes) : "—"}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[var(--treker-text-muted)] mt-3 text-center">
        Тап по строке → детали и редактирование в модалке
      </p>
    </div>
  );
}

/* ─── Page shell ───────────────────────────────────────────────────────── */

const VARIANTS = [
  {
    id: "A",
    title: "Тонкие карточки в стопке",
    summary: "Те же карточки что и сейчас, но узкие: убраны hour-labels, отступы 1.5 раза меньше, время записей в одну строку, разрыв между карточками 6 px вместо 16. Структура знакома, но плотнее.",
    component: VariantA,
  },
  {
    id: "B",
    title: "Строка-в-строку, детали по клику",
    summary: "Каждый день = одна тонкая строка: дата · бар · длительность. Кликаешь — раскрывает запись (или несколько) с кнопками изм./удалить. Самое плотное по вертикали — 7+ дней в окно.",
    component: VariantB,
  },
  {
    id: "C",
    title: "Чистый таймлайн без карточек",
    summary: "Один общий блок: сверху шкала часов, ниже дни друг под другом с разрывом 2 px. Никакого card-chrome между строк, бары почти касаются. Запись редактируется в модалке по тапу.",
    component: VariantC,
  },
];

export default function SleepMockupPage() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="min-h-screen bg-[var(--treker-bg)] text-[var(--treker-text)] p-4 md:p-6">
      <header className="max-w-md mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-1">Сон — варианты плотности</h1>
        <p className="text-sm text-[var(--treker-text-muted)] mb-4">
          Одни и те же 7 ночей. Контейнер max-w-md (≈ телефон). Скажи букву.
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
            <button onClick={() => setPicked(null)} className="px-3 py-1.5 rounded-lg text-sm text-[var(--treker-text-muted)]">
              ← все
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto space-y-10">
        {VARIANTS.filter(v => picked === null || picked === v.id).map((v) => {
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
        Это макет, никакие данные не сохраняются.
      </footer>
    </div>
  );
}
