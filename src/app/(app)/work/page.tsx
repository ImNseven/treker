"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface WorkDay {
  id: string;
  day: string;
  hours: number | string; // Decimal from Prisma
  description: string | null;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstWeekDay(year: number, month: number) {
  const d = new Date(year, month - 1, 1).getDay();
  return (d + 6) % 7; // Mon=0 … Sun=6
}

// Color coding based on hours
function hoursColor(h: number): string {
  if (h >= 8)  return "bg-[var(--treker-accent)] text-white";
  if (h >= 6)  return "bg-orange-400/80 text-white";
  if (h >= 4)  return "bg-orange-300/70 text-orange-900 dark:text-orange-100";
  return "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300";
}

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function WorkPage() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const apiKey = `/api/work?year=${year}&month=${month}`;
  const { data: workDays = [] } = useSWR<WorkDay[]>(apiKey, fetcher);

  const [selected, setSelected] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Map dayKey → WorkDay
  const workMap = useMemo(() => {
    const m = new Map<string, WorkDay>();
    for (const w of workDays) {
      m.set(w.day.slice(0, 10), w);
    }
    return m;
  }, [workDays]);

  // Monthly totals
  const stats = useMemo(() => {
    const total = workDays.reduce((s, w) => s + Number(w.hours), 0);
    const days  = workDays.length;
    return { total, days, avg: days > 0 ? total / days : 0 };
  }, [workDays]);

  const daysInMonth   = getDaysInMonth(year, month);
  const firstWeekDay  = getFirstWeekDay(year, month);
  const todayKey      = toDateKey(today);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function handleCellClick(key: string) {
    setSelected(key);
    setModalOpen(true);
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("ru-RU", {
    month: "long", year: "numeric",
  });

  // Build grid cells (leading blanks + days)
  const cells: Array<{ dayNum: number | null; key: string | null }> = [];
  for (let i = 0; i < firstWeekDay; i++) cells.push({ dayNum: null, key: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ dayNum: d, key });
  }

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      {/* Month switcher */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={prevMonth} className="w-7 h-7 rounded-full bg-[var(--treker-card)] border border-[var(--treker-border)] flex items-center justify-center text-[var(--treker-text-muted)] hover:text-[var(--treker-text)]">‹</button>
        <span className="flex-1 text-center text-sm font-medium text-[var(--treker-text)] capitalize">{monthLabel}</span>
        <button onClick={nextMonth} className="w-7 h-7 rounded-full bg-[var(--treker-card)] border border-[var(--treker-border)] flex items-center justify-center text-[var(--treker-text-muted)] hover:text-[var(--treker-text)]">›</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[var(--treker-card)] rounded-xl p-3 border border-[var(--treker-border)] text-center">
          <p className="text-xs text-[var(--treker-text-muted)]">Дней</p>
          <p className="text-xl font-bold text-[var(--treker-text)] tnum">{stats.days}</p>
        </div>
        <div className="bg-[var(--treker-card)] rounded-xl p-3 border border-[var(--treker-border)] text-center">
          <p className="text-xs text-[var(--treker-text-muted)]">Всего часов</p>
          <p className="text-xl font-bold text-[var(--treker-text)] tnum">{stats.total.toFixed(1)}</p>
        </div>
        <div className="bg-[var(--treker-card)] rounded-xl p-3 border border-[var(--treker-border)] text-center">
          <p className="text-xs text-[var(--treker-text-muted)]">Среднее</p>
          <p className="text-xl font-bold text-[var(--treker-text)] tnum">{stats.avg.toFixed(1)} ч</p>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-[var(--treker-card)] rounded-xl border border-[var(--treker-border)] p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-center text-[10px] text-[var(--treker-text-muted)] font-medium pb-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell.key) {
              return <div key={`blank-${i}`} />;
            }
            const wd = workMap.get(cell.key);
            const h  = wd ? Number(wd.hours) : 0;
            const isToday = cell.key === todayKey;
            return (
              <button
                key={cell.key}
                onClick={() => handleCellClick(cell.key!)}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center text-center transition-all hover:ring-2 hover:ring-[var(--treker-accent)]/50",
                  wd ? hoursColor(h) : "hover:bg-[var(--treker-border)]",
                  isToday && !wd && "ring-2 ring-[var(--treker-accent)]"
                )}
              >
                <span className={cn("text-xs font-medium leading-none", wd ? "" : "text-[var(--treker-text-muted)]")}>
                  {cell.dayNum}
                </span>
                {wd && (
                  <span className="text-[9px] leading-none mt-0.5 opacity-90 tnum">
                    {h % 1 === 0 ? h : h.toFixed(1)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-3 justify-end">
          {[
            { label: "1–3ч", cls: "bg-orange-100 dark:bg-orange-950" },
            { label: "4–5ч", cls: "bg-orange-300/70" },
            { label: "6–7ч", cls: "bg-orange-400/80" },
            { label: "8+ч",  cls: "bg-[var(--treker-accent)]" },
          ].map(({ label, cls }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={cn("w-3 h-3 rounded-sm", cls)} />
              <span className="text-[10px] text-[var(--treker-text-muted)]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day modal */}
      {selected && (
        <WorkDayModal
          open={modalOpen}
          dayKey={selected}
          existing={workMap.get(selected) ?? null}
          onClose={() => { setModalOpen(false); setSelected(null); }}
          onSave={() => { globalMutate(apiKey); setModalOpen(false); setSelected(null); }}
          onDelete={() => { globalMutate(apiKey); setModalOpen(false); setSelected(null); }}
        />
      )}
    </div>
  );
}

// ── WorkDay Modal ─────────────────────────────────────────────────────────────

function WorkDayModal({
  open,
  dayKey,
  existing,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  dayKey: string;
  existing: WorkDay | null;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [hours,       setHours]       = useState(existing ? String(Number(existing.hours)) : "8");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  const [prevExisting, setPrevExisting] = useState<WorkDay | null>(existing);
  if (existing !== prevExisting) {
    setPrevExisting(existing);
    setHours(existing ? String(Number(existing.hours)) : "8");
    setDescription(existing?.description ?? "");
  }

  const hoursNum = parseFloat(hours);
  const valid = !isNaN(hoursNum) && hoursNum > 0 && hoursNum <= 24;

  const dayLabel = new Date(dayKey + "T12:00:00").toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
  });

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    await fetch("/api/work", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: dayKey, hours: hoursNum, description: description.trim() || null }),
    });
    setSaving(false);
    onSave();
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch("/api/work", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: dayKey }),
    });
    setDeleting(false);
    onDelete();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="capitalize">{dayLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Часов</Label>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="8"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Описание <span className="text-[var(--treker-text-muted)] font-normal">(необязательно)</span></Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Что делал…"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !valid}
            className="w-full bg-[var(--treker-accent)] hover:bg-[var(--treker-accent)]/90 text-white"
          >
            {saving ? "Сохраняем…" : existing ? "Обновить" : "Добавить"}
          </Button>

          {existing && (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              {deleting ? "Удаляем…" : "Удалить запись"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
