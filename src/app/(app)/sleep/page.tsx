"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  splitSleepEntry,
  sleepDurationMinutes,
  formatSleepDuration,
  type SleepSegment,
} from "@/lib/sleep";
import { cn } from "@/lib/utils";
import type { SleepEntry } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DAYS = 30; // length of the timeline window

// Hour scale at top of the timeline — every 2 hours
const HOUR_TICKS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toLocalTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface DayRowEntry {
  entry: SleepEntry;
  segments: SleepSegment[];
  totalMinutes: number;
}
interface DayRow {
  dayKey: string;
  date: Date;
  entries: DayRowEntry[];     // entries that started this day (for the editor list)
  daySegments: SleepSegment[]; // every segment overlapping this day (for the bar)
  totalMinutes: number;        // sum of asleep minutes during this day
}

function buildTimeline(entries: SleepEntry[]): DayRow[] {
  const map = new Map<string, DayRow>();

  function ensure(key: string, date: Date): DayRow {
    let r = map.get(key);
    if (!r) {
      r = { dayKey: key, date, entries: [], daySegments: [], totalMinutes: 0 };
      map.set(key, r);
    }
    return r;
  }

  for (const entry of entries) {
    const startAt = new Date(entry.startAt);
    const endAt   = new Date(entry.endAt);
    const segments = splitSleepEntry({ startAt, endAt });
    const totalEntryMinutes = sleepDurationMinutes({ startAt, endAt });

    for (const seg of segments) {
      const [yy, mm, dd] = seg.dayKey.split("-").map(Number);
      const row = ensure(seg.dayKey, new Date(yy, mm - 1, dd));
      row.daySegments.push(seg);
      row.totalMinutes += seg.endMinute - seg.startMinute;
    }

    // Entry detail belongs on its start day
    const startKey = toLocalDateStr(startAt);
    const startRow = ensure(startKey, new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate()));
    startRow.entries.push({ entry, segments, totalMinutes: totalEntryMinutes });
  }

  // Build the 30-day skeleton ending today (newest first)
  const today = new Date();
  const result: DayRow[] = [];
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = toLocalDateStr(date);
    const existing = map.get(key);
    result.push(existing ?? { dayKey: key, date, entries: [], daySegments: [], totalMinutes: 0 });
  }
  return result;
}

// ── Bar primitive: 24h, hourly grid, gradient segments ──────────────────
function TimelineBar({ segments }: { segments: SleepSegment[] }) {
  return (
    <div className="relative h-3 rounded-full bg-[var(--treker-border)] overflow-hidden">
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
      {/* Hour ticks every 2 hours — slightly bolder on the even ticks */}
      {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
        <div
          key={h}
          className={cn(
            "absolute top-0 h-full w-px",
            h % 2 === 0 ? "bg-black/15 dark:bg-white/15" : "bg-black/5 dark:bg-white/5"
          )}
          style={{ left: `${(h / 24) * 100}%` }}
        />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function SleepPage() {
  const apiKey = "/api/sleep";
  const { data: rawEntries = [] } = useSWR<SleepEntry[]>(apiKey, fetcher);

  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<SleepEntry | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<DayRow | null>(null);

  const timeline = useMemo(() => buildTimeline(rawEntries), [rawEntries]);

  // Average over the last 7 entries
  const avgDuration = useMemo(() => {
    if (!rawEntries.length) return 0;
    const last7 = rawEntries.slice(0, 7);
    const total = last7.reduce(
      (sum, e) => sum + sleepDurationMinutes({ startAt: new Date(e.startAt), endAt: new Date(e.endAt) }),
      0
    );
    return Math.round(total / last7.length);
  }, [rawEntries]);

  async function handleDelete(id: string) {
    await fetch(`/api/sleep/${id}`, { method: "DELETE" });
    globalMutate(apiKey);
    setDeleteId(null);
  }

  function openCreateForToday() {
    setEditEntry(null);
    setModalDefaultDate(null);
    setModalOpen(true);
  }
  function openCreateForDate(dayKey: string) {
    setEditEntry(null);
    setModalDefaultDate(dayKey);
    setModalOpen(true);
    setOpenDay(null);
  }
  function openEdit(entry: SleepEntry) {
    setEditEntry(entry);
    setModalDefaultDate(null);
    setModalOpen(true);
    setOpenDay(null);
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Stats + add button */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--treker-text-muted)] font-medium">Среднее (7 записей)</p>
          <p className="text-2xl font-bold text-[var(--treker-text)] tnum">
            {avgDuration > 0 ? formatSleepDuration(avgDuration) : "—"}
          </p>
        </div>
        <Button
          onClick={openCreateForToday}
          className="bg-[var(--treker-accent)] hover:bg-[var(--treker-accent)]/90 text-white border-2 border-[var(--treker-accent)] shadow-md gap-1.5 active:scale-[0.98]"
          size="sm"
        >
          <Plus size={16} />
          Добавить
        </Button>
      </div>

      {/* Timeline */}
      <div className="bg-[var(--treker-card)] rounded-xl border border-[var(--treker-border)] shadow-[var(--treker-shadow-card)] p-3 md:p-4">
        {/* Top hour scale, shared by every row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-14 shrink-0" />
          <div className="flex-1 relative h-3">
            {HOUR_TICKS.map((h) => (
              <span
                key={h}
                className="absolute -translate-x-1/2 text-[8px] md:text-[9px] text-[var(--treker-text-muted)] tnum"
                style={{ left: `${(h / 24) * 100}%`, top: 0 }}
              >
                {h === 24 ? 0 : h}
              </span>
            ))}
          </div>
          <div className="w-12 shrink-0 text-right text-[10px] text-[var(--treker-text-muted)]">всего</div>
        </div>

        {/* 30 rows, newest at top, packed tight (2 px gap) */}
        <div className="space-y-[2px]">
          {timeline.map((row) => {
            const hasEntries = row.entries.length > 0;
            const dayLabel = row.date.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" });
            return (
              <button
                key={row.dayKey}
                type="button"
                onClick={() => setOpenDay(row)}
                className="w-full flex items-center gap-2 group rounded-md hover:bg-[var(--treker-border)]/30 transition-colors px-1 py-px text-left"
              >
                <span className={cn(
                  "w-14 shrink-0 text-[11px] truncate",
                  hasEntries || row.totalMinutes > 0
                    ? "text-[var(--treker-text)]"
                    : "text-[var(--treker-text-muted)]"
                )}>
                  {dayLabel}
                </span>
                <div className="flex-1">
                  <TimelineBar segments={row.daySegments} />
                </div>
                <span className={cn(
                  "w-12 shrink-0 text-right text-[11px] tnum",
                  row.totalMinutes > 0 ? "text-[var(--treker-text)] font-medium" : "text-[var(--treker-text-muted)]"
                )}>
                  {row.totalMinutes > 0 ? formatSleepDuration(row.totalMinutes) : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-[var(--treker-text-muted)] text-center mt-3">
        Тап по строке — записи и редактирование. Скролл: последние {DAYS} дней.
      </p>

      {/* Day detail dialog */}
      {openDay && (
        <DayDetailDialog
          row={openDay}
          onClose={() => setOpenDay(null)}
          onEditEntry={openEdit}
          onAddForDate={() => openCreateForDate(openDay.dayKey)}
          onDelete={(id) => setDeleteId(id)}
        />
      )}

      {/* Add / Edit modal */}
      <SleepModal
        key={editEntry?.id ?? modalDefaultDate ?? "new"}
        open={modalOpen}
        entry={editEntry}
        defaultDate={modalDefaultDate}
        onClose={() => { setModalOpen(false); setEditEntry(null); setModalDefaultDate(null); }}
        onSave={() => { globalMutate(apiKey); setModalOpen(false); setEditEntry(null); setModalDefaultDate(null); }}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Удалить запись?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--treker-text-muted)] mt-1">Это действие нельзя отменить.</p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Удалить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Day detail dialog: shows the day's bar + list of entries + add button ─

function DayDetailDialog({
  row, onClose, onEditEntry, onAddForDate, onDelete,
}: {
  row: DayRow;
  onClose: () => void;
  onEditEntry: (entry: SleepEntry) => void;
  onAddForDate: () => void;
  onDelete: (id: string) => void;
}) {
  const longLabel = row.date.toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
  });
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="capitalize">{longLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Big bar for the day */}
          <div>
            <TimelineBar segments={row.daySegments} />
            <div className="flex justify-between mt-1">
              {[0, 6, 12, 18, 24].map((h) => (
                <span key={h} className="text-[9px] text-[var(--treker-text-muted)] tnum">
                  {h === 24 ? 0 : h}
                </span>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-[var(--treker-text-muted)]">Сон за сутки</p>
            <p className="text-xl font-bold tnum text-[var(--treker-text)]">
              {row.totalMinutes > 0 ? formatSleepDuration(row.totalMinutes) : "0ч 0м"}
            </p>
          </div>

          {/* Entries that started this day */}
          {row.entries.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-[var(--treker-text-muted)]">Записи начатые в этот день</p>
              {row.entries.map(({ entry, totalMinutes }) => {
                const startAt = new Date(entry.startAt);
                const endAt   = new Date(entry.endAt);
                const crossesMidnight = toLocalDateStr(startAt) !== toLocalDateStr(endAt);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--treker-border)]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm tnum">
                        {toLocalTimeStr(startAt)} — {toLocalTimeStr(endAt)}
                        {crossesMidnight && <span className="text-[10px] text-[var(--treker-text-muted)] ml-1">+1д</span>}
                      </p>
                      <p className="text-[11px] text-[var(--treker-text-muted)] tnum">
                        {formatSleepDuration(totalMinutes)}
                      </p>
                    </div>
                    <button
                      onClick={() => onEditEntry(entry)}
                      className="p-1.5 rounded-md text-[var(--treker-text-muted)] hover:text-[var(--treker-text)] hover:bg-[var(--treker-border)]/40 transition-colors"
                      aria-label="Изменить"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="p-1.5 rounded-md text-[var(--treker-text-muted)] hover:text-[var(--treker-expense)] hover:bg-[var(--treker-expense)]/10 transition-colors"
                      aria-label="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            onClick={onAddForDate}
            className="w-full bg-[var(--treker-accent)] text-white border-2 border-[var(--treker-accent)] shadow-md hover:bg-[var(--treker-accent)]/90 active:scale-[0.98] gap-1.5"
          >
            <Plus size={15} />
            Добавить запись на этот день
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sleep create/edit modal (mostly the same as before, accepts defaultDate) ─

function SleepModal({
  open, entry, defaultDate, onClose, onSave,
}: {
  open: boolean;
  entry: SleepEntry | null;
  defaultDate: string | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const today = new Date();
  const todayStr = toLocalDateStr(today);
  const baseDate = entry
    ? toLocalDateStr(new Date(entry.startAt))
    : (defaultDate ?? todayStr);

  const initStartDate = entry ? toLocalDateStr(new Date(entry.startAt)) : baseDate;
  const initStartTime = entry ? toLocalTimeStr(new Date(entry.startAt)) : "23:00";
  // For a new entry, end the *next* day
  const defaultEndDate = (() => {
    const [yy, mm, dd] = baseDate.split("-").map(Number);
    const d = new Date(yy, mm - 1, dd + 1);
    return toLocalDateStr(d);
  })();
  const initEndDate   = entry ? toLocalDateStr(new Date(entry.endAt)) : defaultEndDate;
  const initEndTime   = entry ? toLocalTimeStr(new Date(entry.endAt)) : "07:00";

  const [startDate, setStartDate] = useState(initStartDate);
  const [startTime, setStartTime] = useState(initStartTime);
  const [endDate,   setEndDate]   = useState(initEndDate);
  const [endTime,   setEndTime]   = useState(initEndTime);
  const [saving,    setSaving]    = useState(false);

  const startAt = new Date(`${startDate}T${startTime}:00`);
  const endAt   = new Date(`${endDate}T${endTime}:00`);
  const valid   = !isNaN(startAt.getTime()) && !isNaN(endAt.getTime()) && endAt > startAt;
  const durationMin = valid ? sleepDurationMinutes({ startAt, endAt }) : 0;

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    const body = JSON.stringify({
      startAt: startAt.toISOString(),
      endAt:   endAt.toISOString(),
    });
    if (entry) {
      await fetch(`/api/sleep/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } else {
      await fetch("/api/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    }
    setSaving(false);
    onSave();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{entry ? "Изменить запись" : "Добавить сон"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Начало</Label>
            <div className="flex gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1" />
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-28" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Конец</Label>
            <div className="flex gap-2">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1" />
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-28" />
            </div>
          </div>

          {valid ? (
            <p className="text-sm text-[var(--treker-text-muted)] text-center">
              Длительность:{" "}
              <span className="font-semibold text-[var(--treker-text)] tnum">
                {formatSleepDuration(durationMin)}
              </span>
            </p>
          ) : startDate && startTime && endDate && endTime ? (
            <p className="text-xs text-[var(--treker-expense)] text-center">Конец должен быть позже начала</p>
          ) : null}

          <Button
            onClick={handleSave}
            disabled={saving || !valid}
            className="w-full h-10 bg-[var(--treker-accent)] text-white border-2 border-[var(--treker-accent)] shadow-md hover:bg-[var(--treker-accent)]/90 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "Сохраняем…" : entry ? "Сохранить" : "Добавить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
