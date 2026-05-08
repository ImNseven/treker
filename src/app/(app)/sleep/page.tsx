"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SleepBar } from "@/components/sleep-bar";
import { splitSleepEntry, sleepDurationMinutes, formatSleepDuration } from "@/lib/sleep";
import type { SleepEntry } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toLocalTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface DayRowEntry {
  entry: SleepEntry;
  segments: ReturnType<typeof splitSleepEntry>;
  totalMinutes: number;
}

interface DayRow {
  dayKey: string;
  entries: DayRowEntry[];
  totalMinutes: number;
}

function buildDayRows(entries: SleepEntry[]): DayRow[] {
  const dayMap = new Map<string, DayRow>();

  for (const entry of entries) {
    const startAt = new Date(entry.startAt);
    const endAt   = new Date(entry.endAt);
    const segments = splitSleepEntry({ startAt, endAt });
    const totalMinutes = sleepDurationMinutes({ startAt, endAt });

    // Ensure all touched days exist in map
    for (const seg of segments) {
      if (!dayMap.has(seg.dayKey)) {
        dayMap.set(seg.dayKey, { dayKey: seg.dayKey, entries: [], totalMinutes: 0 });
      }
    }

    // Associate entry with the start day
    const primaryDay = toLocalDateStr(startAt);
    if (!dayMap.has(primaryDay)) {
      dayMap.set(primaryDay, { dayKey: primaryDay, entries: [], totalMinutes: 0 });
    }
    const row = dayMap.get(primaryDay)!;
    row.entries.push({ entry, segments, totalMinutes });
    row.totalMinutes += totalMinutes;
  }

  return Array.from(dayMap.values()).sort((a, b) => b.dayKey.localeCompare(a.dayKey));
}

function segmentsForDay(dayKey: string, entries: DayRowEntry[]) {
  return entries.flatMap(e => e.segments.filter(s => s.dayKey === dayKey));
}

export default function SleepPage() {
  const apiKey = "/api/sleep";
  const { data: rawEntries = [] } = useSWR<SleepEntry[]>(apiKey, fetcher);

  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<SleepEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const dayRows = useMemo(() => buildDayRows(rawEntries), [rawEntries]);

  // Average over last 7 entries
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

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Stats header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-[--treker-text-muted] font-medium">Среднее (7 записей)</p>
          <p className="text-2xl font-bold text-[--treker-text] tnum">
            {avgDuration > 0 ? formatSleepDuration(avgDuration) : "—"}
          </p>
        </div>
        <Button
          onClick={() => { setEditEntry(null); setModalOpen(true); }}
          className="bg-[--treker-accent] hover:bg-[--treker-accent]/90 text-white gap-1.5"
          size="sm"
        >
          <Plus size={16} />
          Добавить
        </Button>
      </div>

      {/* Day rows */}
      <div className="space-y-4">
        {dayRows.length === 0 && (
          <p className="text-[--treker-text-muted] text-sm text-center py-10">
            Нет записей. Добавьте первую!
          </p>
        )}

        {dayRows.map((row) => (
          <div key={row.dayKey} className="bg-[--treker-card] rounded-xl p-4 border border-[--treker-border]">
            {/* Day header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[--treker-text]">
                {new Date(row.dayKey + "T12:00:00").toLocaleDateString("ru-RU", {
                  weekday: "short", day: "numeric", month: "short",
                })}
              </span>
              <span className="text-xs text-[--treker-text-muted] tnum">
                {row.totalMinutes > 0 ? formatSleepDuration(row.totalMinutes) : ""}
              </span>
            </div>

            {/* 24h sleep bar */}
            <SleepBar
              segments={segmentsForDay(row.dayKey, row.entries)}
              className="mb-3"
            />

            {/* Individual entries */}
            {row.entries.map(({ entry, totalMinutes }) => {
              const startAt = new Date(entry.startAt);
              const endAt   = new Date(entry.endAt);
              const crossesMidnight = toLocalDateStr(startAt) !== toLocalDateStr(endAt);
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-xs text-[--treker-text-muted] mt-1.5"
                >
                  <span className="tnum">
                    {toLocalTimeStr(startAt)} — {toLocalTimeStr(endAt)}
                    {crossesMidnight && <span className="ml-1 opacity-60">(+1д)</span>}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="tnum text-[--treker-text]">{formatSleepDuration(totalMinutes)}</span>
                    <button
                      onClick={() => { setEditEntry(entry); setModalOpen(true); }}
                      className="hover:text-[--treker-text] transition-colors"
                    >
                      Изм.
                    </button>
                    <button
                      onClick={() => setDeleteId(entry.id)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Add / Edit modal */}
      <SleepModal
        open={modalOpen}
        entry={editEntry}
        onClose={() => { setModalOpen(false); setEditEntry(null); }}
        onSave={() => { globalMutate(apiKey); setModalOpen(false); setEditEntry(null); }}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Удалить запись?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[--treker-text-muted] mt-1">Это действие нельзя отменить.</p>
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

// ── Sleep Modal ────────────────────────────────────────────────────────────────

function SleepModal({
  open,
  entry,
  onClose,
  onSave,
}: {
  open: boolean;
  entry: SleepEntry | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const today = new Date();
  const todayStr = toLocalDateStr(today);

  const initStartDate = entry ? toLocalDateStr(new Date(entry.startAt)) : todayStr;
  const initStartTime = entry ? toLocalTimeStr(new Date(entry.startAt)) : "23:00";
  const initEndDate   = entry ? toLocalDateStr(new Date(entry.endAt))   : todayStr;
  const initEndTime   = entry ? toLocalTimeStr(new Date(entry.endAt))   : "07:00";

  const [startDate, setStartDate] = useState(initStartDate);
  const [startTime, setStartTime] = useState(initStartTime);
  const [endDate,   setEndDate]   = useState(initEndDate);
  const [endTime,   setEndTime]   = useState(initEndTime);
  const [saving,    setSaving]    = useState(false);

  // Sync state when entry changes (modal re-open)
  const [prevEntry, setPrevEntry] = useState<SleepEntry | null>(entry);
  if (entry !== prevEntry) {
    setPrevEntry(entry);
    setStartDate(entry ? toLocalDateStr(new Date(entry.startAt)) : todayStr);
    setStartTime(entry ? toLocalTimeStr(new Date(entry.startAt)) : "23:00");
    setEndDate(entry   ? toLocalDateStr(new Date(entry.endAt))   : todayStr);
    setEndTime(entry   ? toLocalTimeStr(new Date(entry.endAt))   : "07:00");
  }

  const startAt = new Date(`${startDate}T${startTime}:00`);
  const endAt   = new Date(`${endDate}T${endTime}:00`);
  const valid   = !isNaN(startAt.getTime()) && !isNaN(endAt.getTime()) && endAt > startAt;
  const durationMin = valid ? sleepDurationMinutes({ startAt, endAt }) : 0;

  const previewSegments = valid
    ? splitSleepEntry({ startAt, endAt }).filter(s => s.dayKey === toLocalDateStr(startAt))
    : [];

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
          {/* Start */}
          <div className="space-y-1.5">
            <Label>Начало</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1"
              />
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-28"
              />
            </div>
          </div>

          {/* End */}
          <div className="space-y-1.5">
            <Label>Конец</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1"
              />
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-28"
              />
            </div>
          </div>

          {/* Duration preview */}
          {valid ? (
            <p className="text-sm text-[--treker-text-muted] text-center">
              Длительность:{" "}
              <span className="font-semibold text-[--treker-text] tnum">
                {formatSleepDuration(durationMin)}
              </span>
            </p>
          ) : startDate && startTime && endDate && endTime ? (
            <p className="text-xs text-red-500 text-center">Конец должен быть позже начала</p>
          ) : null}

          {/* Preview bar */}
          {previewSegments.length > 0 && (
            <SleepBar segments={previewSegments} className="mt-1" />
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !valid}
            className="w-full bg-[--treker-accent] hover:bg-[--treker-accent]/90 text-white"
          >
            {saving ? "Сохраняем…" : entry ? "Сохранить" : "Добавить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
