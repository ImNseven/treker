"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Plus, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  parseDurationToSeconds,
  formatDuration,
  calcPaceSecondsPerKm,
  formatPace,
} from "@/lib/running";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Run {
  id: string;
  occurredOn: string;
  distanceKm: number | string; // Decimal from Prisma
  durationSec: number;
  note: string | null;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function RunningPage() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const apiKey = `/api/running?year=${year}&month=${month}`;
  const { data: runs = [] } = useSWR<Run[]>(apiKey, fetcher);

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editRun,    setEditRun]    = useState<Run | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  // Stats
  const stats = useMemo(() => {
    if (!runs.length) return { totalKm: 0, totalSec: 0, count: 0, avgPace: null };
    const totalKm  = runs.reduce((s, r) => s + Number(r.distanceKm), 0);
    const totalSec = runs.reduce((s, r) => s + r.durationSec, 0);
    const avgPace  = calcPaceSecondsPerKm(totalKm, totalSec);
    return { totalKm, totalSec, count: runs.length, avgPace };
  }, [runs]);

  // Chart: distance per day
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of runs) {
      const key = r.occurredOn.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + Number(r.distanceKm));
    }
    return Array.from(map.entries())
      .map(([date, km]) => ({ date: date.slice(5), km: +km.toFixed(2) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [runs]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/running/${id}`, { method: "DELETE" });
    globalMutate(apiKey);
    setDeleteId(null);
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("ru-RU", {
    month: "long", year: "numeric",
  });

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Month switcher */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={prevMonth} className="w-7 h-7 rounded-full bg-[--treker-card] border border-[--treker-border] flex items-center justify-center text-[--treker-text-muted] hover:text-[--treker-text]">‹</button>
        <span className="flex-1 text-center text-sm font-medium text-[--treker-text] capitalize">{monthLabel}</span>
        <button onClick={nextMonth} className="w-7 h-7 rounded-full bg-[--treker-card] border border-[--treker-border] flex items-center justify-center text-[--treker-text-muted] hover:text-[--treker-text]">›</button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[--treker-card] rounded-xl p-3 border border-[--treker-border] text-center">
          <p className="text-xs text-[--treker-text-muted]">Пробежки</p>
          <p className="text-xl font-bold text-[--treker-text] tnum">{stats.count}</p>
        </div>
        <div className="bg-[--treker-card] rounded-xl p-3 border border-[--treker-border] text-center">
          <p className="text-xs text-[--treker-text-muted]">Дистанция</p>
          <p className="text-xl font-bold text-[--treker-text] tnum">{stats.totalKm.toFixed(1)} <span className="text-sm font-normal">км</span></p>
        </div>
        <div className="bg-[--treker-card] rounded-xl p-3 border border-[--treker-border] text-center">
          <p className="text-xs text-[--treker-text-muted]">Темп</p>
          <p className="text-base font-bold text-[--treker-text] tnum">
            {stats.avgPace ? formatPace(stats.avgPace) : "—"}
          </p>
        </div>
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="bg-[--treker-card] rounded-xl p-4 border border-[--treker-border] mb-5">
          <p className="text-xs text-[--treker-text-muted] mb-3">км по дням</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} barSize={12}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--treker-text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v: number) => [`${v} км`, "Дистанция"]}
                contentStyle={{ background: "var(--treker-card)", border: "1px solid var(--treker-border)", borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: "var(--treker-border)" }}
              />
              <Bar dataKey="km" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="url(#runGradient)" />
                ))}
              </Bar>
              <defs>
                <linearGradient id="runGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add button */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => { setEditRun(null); setModalOpen(true); }}
          className="bg-[--treker-accent] hover:bg-[--treker-accent]/90 text-white gap-1.5"
          size="sm"
        >
          <Plus size={16} />
          Добавить
        </Button>
      </div>

      {/* Run list */}
      <div className="space-y-2">
        {runs.length === 0 && (
          <p className="text-[--treker-text-muted] text-sm text-center py-10">
            Нет пробежек за этот месяц.
          </p>
        )}
        {runs.map((run) => {
          const km  = Number(run.distanceKm);
          const pace = calcPaceSecondsPerKm(km, run.durationSec);
          return (
            <div
              key={run.id}
              className="bg-[--treker-card] rounded-xl px-4 py-3 border border-[--treker-border] flex items-center gap-3"
            >
              {/* Date */}
              <div className="text-xs text-[--treker-text-muted] w-14 shrink-0">
                {new Date(run.occurredOn).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
              </div>

              {/* Stats */}
              <div className="flex-1 flex gap-4">
                <span className="text-sm font-semibold text-[--treker-text] tnum">{km.toFixed(2)} км</span>
                <span className="text-sm text-[--treker-text-muted] tnum">{formatDuration(run.durationSec)}</span>
                {pace && <span className="text-sm text-[--treker-text-muted] tnum">{formatPace(pace)}</span>}
              </div>

              {run.note && (
                <span className="text-xs text-[--treker-text-muted] truncate max-w-[80px]">{run.note}</span>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setEditRun(run); setModalOpen(true); }}
                  className="text-xs text-[--treker-text-muted] hover:text-[--treker-text] transition-colors"
                >
                  Изм.
                </button>
                <button
                  onClick={() => setDeleteId(run.id)}
                  className="text-[--treker-text-muted] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit modal */}
      <RunModal
        open={modalOpen}
        run={editRun}
        defaultDate={toDateStr(today)}
        onClose={() => { setModalOpen(false); setEditRun(null); }}
        onSave={() => { globalMutate(apiKey); setModalOpen(false); setEditRun(null); }}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Удалить пробежку?</DialogTitle></DialogHeader>
          <p className="text-sm text-[--treker-text-muted] mt-1">Это действие нельзя отменить.</p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Отмена</Button>
            <Button variant="destructive" className="flex-1" onClick={() => deleteId && handleDelete(deleteId)}>Удалить</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Run Modal ────────────────────────────────────────────────────────────────

function RunModal({
  open,
  run,
  defaultDate,
  onClose,
  onSave,
}: {
  open: boolean;
  run: Run | null;
  defaultDate: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const initDate     = run ? run.occurredOn.slice(0, 10) : defaultDate;
  const initDistance = run ? String(Number(run.distanceKm)) : "";
  const initDuration = run ? formatDuration(run.durationSec) : "";
  const initNote     = run?.note ?? "";

  const [date,     setDate]     = useState(initDate);
  const [distance, setDistance] = useState(initDistance);
  const [duration, setDuration] = useState(initDuration);
  const [note,     setNote]     = useState(initNote);
  const [saving,   setSaving]   = useState(false);

  // Sync when run changes
  const [prevRun, setPrevRun] = useState<Run | null>(run);
  if (run !== prevRun) {
    setPrevRun(run);
    setDate(run     ? run.occurredOn.slice(0, 10) : defaultDate);
    setDistance(run ? String(Number(run.distanceKm)) : "");
    setDuration(run ? formatDuration(run.durationSec) : "");
    setNote(run?.note ?? "");
  }

  const durationSec = parseDurationToSeconds(duration);
  const distanceKm  = parseFloat(distance);
  const valid = !!date && !isNaN(distanceKm) && distanceKm > 0 && durationSec !== null && durationSec > 0;

  const pace = valid && durationSec ? calcPaceSecondsPerKm(distanceKm, durationSec) : null;

  async function handleSave() {
    if (!valid || durationSec === null) return;
    setSaving(true);
    const body = JSON.stringify({
      occurredOn:  date,
      distanceKm:  distanceKm,
      durationSec: durationSec,
      note:        note.trim() || null,
    });
    if (run) {
      await fetch(`/api/running/${run.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } else {
      await fetch("/api/running", {
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
          <DialogTitle>{run ? "Изменить пробежку" : "Добавить пробежку"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Дата</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Дистанция (км)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="5.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Время (мм:сс)</Label>
              <Input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="25:00"
              />
            </div>
          </div>

          {/* Pace preview */}
          {pace && (
            <p className="text-sm text-[--treker-text-muted] text-center">
              Темп: <span className="font-semibold text-[--treker-text] tnum">{formatPace(pace)}</span>
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Заметка <span className="text-[--treker-text-muted] font-normal">(необязательно)</span></Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Утренняя пробежка…"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !valid}
            className="w-full bg-[--treker-accent] hover:bg-[--treker-accent]/90 text-white"
          >
            {saving ? "Сохраняем…" : run ? "Сохранить" : "Добавить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
