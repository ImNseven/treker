"use client";
import { useState, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Plus, Pencil, Archive, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicIcon } from "@/components/dynamic-icon";
import { calcStreak } from "@/lib/habits";
import type { Habit, HabitLog } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const ICON_OPTIONS = [
  "Sun", "Moon", "Smile", "Heart", "Footprints", "Waves", "Zap",
  "Coffee", "Book", "Music", "Dumbbell", "Apple", "CheckCircle",
];

const COLOR_OPTIONS = [
  "#f97316", "#ec4899", "#ea580c", "#be123c",
  "#6366f1", "#0ea5e9", "#14b8a6", "#84cc16", "#f59e0b",
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function HabitsPage() {
  const today = new Date();
  const todayKey = toDateKey(today);

  // Month state — defaults to current month, navigable via arrows
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  const { data: habits = [] } = useSWR<Habit[]>("/api/habits", fetcher);
  const logsKey = `/api/habits/log?year=${year}&month=${month}`;
  const { data: logs = [] } = useSWR<HabitLog[]>(logsKey, fetcher);

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editHabit,  setEditHabit]  = useState<Habit | null>(null);
  const [menuHabit,  setMenuHabit]  = useState<Habit | null>(null);

  // Fast lookups
  const todayLogSet = useMemo(
    () => new Set(logs.filter(l => toDateKey(new Date(l.day)) === todayKey).map(l => l.habitId)),
    [logs, todayKey]
  );
  const logSet = useMemo(
    () => new Set(logs.map(l => `${l.habitId}-${toDateKey(new Date(l.day))}`)),
    [logs]
  );

  // Refresh both the habits list and *every* cached month-log key after a write
  function refreshLogs() {
    globalMutate((key) => typeof key === "string" && key.startsWith("/api/habits/log"));
  }

  async function toggleDay(habitId: string, dayKey: string, currentlyChecked: boolean) {
    await fetch("/api/habits/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId, day: dayKey, checked: !currentlyChecked }),
    });
    refreshLogs();
  }

  async function archiveHabit(id: string) {
    await fetch(`/api/habits/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: true }),
    });
    globalMutate("/api/habits");
    setMenuHabit(null);
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth() + 1)) return;
    if (isCurrentMonth) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const daysInMonth   = new Date(year, month, 0).getDate();
  const firstWeekday  = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Today strip — quick toggle */}
      <div className="mb-6">
        <p className="text-xs text-[var(--treker-text-muted)] font-medium mb-3">Сегодня</p>
        <div className="flex gap-3 flex-wrap">
          {habits.map((h) => {
            const done = todayLogSet.has(h.id);
            return (
              <div key={h.id} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => toggleDay(h.id, todayKey, done)}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95",
                    done
                      ? "text-white shadow-md"
                      : "bg-[var(--treker-card)] border-2 border-[var(--treker-border)] text-[var(--treker-text-muted)] hover:border-[var(--treker-accent)]"
                  )}
                  style={done ? { background: `linear-gradient(135deg, ${h.color}, ${h.color}cc)` } : {}}
                  title={h.name}
                >
                  <DynamicIcon name={h.icon} size={24} />
                </button>
                <span className="text-[10px] text-[var(--treker-text-muted)] w-14 text-center truncate">{h.name}</span>
              </div>
            );
          })}
          <button
            onClick={() => { setEditHabit(null); setModalOpen(true); }}
            className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-dashed border-[var(--treker-border)] text-[var(--treker-text-muted)] hover:border-[var(--treker-accent)] hover:text-[var(--treker-accent)] transition-colors"
            aria-label="Добавить привычку"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Month switcher */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-full border border-[var(--treker-border)] bg-[var(--treker-card)] flex items-center justify-center text-[var(--treker-text-muted)] hover:text-[var(--treker-text)] transition-colors"
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-[var(--treker-text)] capitalize tnum">
          {monthLabel}
        </span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="w-8 h-8 rounded-full border border-[var(--treker-border)] bg-[var(--treker-card)] flex items-center justify-center text-[var(--treker-text-muted)] hover:text-[var(--treker-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Следующий месяц"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Grid of habit cards: 2 cols mobile, 3 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {habits.map((h) => {
          // Per-month stats
          let doneCount = 0, totalCount = 0;
          for (let d = 1; d <= daysInMonth; d++) {
            const cellDate = new Date(year, month - 1, d);
            if (cellDate > today) continue;
            totalCount++;
            if (logSet.has(`${h.id}-${toDateKey(cellDate)}`)) doneCount++;
          }
          const habitLogDates = logs.filter(l => l.habitId === h.id).map(l => new Date(l.day));
          const streak = calcStreak(habitLogDates, today);
          const pct = totalCount > 0 ? Math.round((100 * doneCount) / totalCount) : 0;

          return (
            <div
              key={h.id}
              className="bg-[var(--treker-card)] rounded-xl shadow-[var(--treker-shadow-card)] p-3 md:p-4 min-w-0"
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2.5">
                <div
                  className="w-7 h-7 md:w-8 md:h-8 rounded-md flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: h.color }}
                >
                  <DynamicIcon name={h.icon} size={14} />
                </div>
                <span className="flex-1 text-xs md:text-sm font-semibold truncate" title={h.name}>
                  {h.name}
                </span>
                <span
                  className="flex items-center gap-0.5 text-[11px] md:text-xs font-semibold shrink-0"
                  style={{ color: h.color }}
                  title={`Стрик: ${streak}`}
                >
                  <Flame size={12} /> {streak}
                </span>
                <button
                  onClick={() => setMenuHabit(h)}
                  className="text-[var(--treker-text-muted)] hover:text-[var(--treker-text)] p-0.5 shrink-0"
                  aria-label="Действия с привычкой"
                >
                  <Pencil size={11} />
                </button>
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-0.5 md:gap-1 mb-2">
                {WEEKDAYS.map((wd) => (
                  <span key={wd} className="text-[8px] md:text-[10px] text-[var(--treker-text-muted)] text-center py-0.5">
                    {wd}
                  </span>
                ))}
                {Array.from({ length: firstWeekday }, (_, i) => <div key={`pad-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const cellDate = new Date(year, month - 1, d);
                  const isFuture = cellDate > today && toDateKey(cellDate) !== todayKey;
                  const isToday  = toDateKey(cellDate) === todayKey;
                  const key      = `${h.id}-${toDateKey(cellDate)}`;
                  const done     = logSet.has(key);

                  return (
                    <button
                      key={d}
                      onClick={() => !isFuture && toggleDay(h.id, toDateKey(cellDate), done)}
                      disabled={isFuture}
                      className={cn(
                        "aspect-square rounded-[4px] md:rounded-md flex items-center justify-center text-[9px] md:text-[11px] transition-all",
                        isFuture && "opacity-30 text-[var(--treker-text-muted)] cursor-not-allowed",
                        !isFuture && done && "text-white font-medium shadow-sm active:scale-90",
                        !isFuture && !done && "bg-[var(--treker-border)]/40 text-[var(--treker-text-muted)] hover:bg-[var(--treker-border)]/70 active:scale-90",
                        isToday && "ring-2 ring-[var(--treker-accent)] ring-offset-1 ring-offset-[var(--treker-card)]"
                      )}
                      style={done ? { backgroundColor: h.color } : {}}
                      aria-label={`${d}: ${done ? "отметка стоит" : "не отмечено"}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              {/* Footer: stats */}
              <div className="flex items-center justify-between text-[10px] md:text-[11px] text-[var(--treker-text-muted)] pt-1.5 border-t border-[var(--treker-border)]">
                <span>выполнено</span>
                <span className="font-semibold tnum text-[var(--treker-text)]">
                  {doneCount}/{totalCount}
                  <span className="text-[var(--treker-text-muted)] font-normal ml-1">({pct}%)</span>
                </span>
              </div>
            </div>
          );
        })}

        {/* Empty state if no habits */}
        {habits.length === 0 && (
          <div className="col-span-2 md:col-span-3 bg-[var(--treker-card)] rounded-xl border border-[var(--treker-border)] py-12 text-center">
            <p className="text-sm text-[var(--treker-text-muted)] mb-3">Пока нет привычек.</p>
            <Button
              onClick={() => { setEditHabit(null); setModalOpen(true); }}
              className="bg-[var(--treker-accent)] hover:bg-[var(--treker-accent)]/90 text-white"
            >
              <Plus size={16} className="mr-1" />
              Добавить первую
            </Button>
          </div>
        )}
      </div>

      {/* Habit menu dialog */}
      {menuHabit && (
        <Dialog open={!!menuHabit} onOpenChange={(v) => { if (!v) setMenuHabit(null); }}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-md flex items-center justify-center text-white" style={{ backgroundColor: menuHabit.color }}>
                  <DynamicIcon name={menuHabit.icon} size={14} />
                </span>
                {menuHabit.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-1 mt-2">
              <button
                onClick={() => { setEditHabit(menuHabit); setMenuHabit(null); setModalOpen(true); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--treker-text)] hover:bg-[var(--treker-border)]/50 transition-colors"
              >
                <Pencil size={16} />
                Изменить
              </button>
              <button
                onClick={() => archiveHabit(menuHabit.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--treker-text-muted)] hover:bg-[var(--treker-border)]/50 transition-colors"
              >
                <Archive size={16} />
                Архивировать
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add/Edit habit modal */}
      <HabitModal
        open={modalOpen}
        habit={editHabit}
        onClose={() => { setModalOpen(false); setEditHabit(null); }}
        onSave={() => { globalMutate("/api/habits"); setModalOpen(false); setEditHabit(null); }}
      />
    </div>
  );
}

function HabitModal({
  open, habit, onClose, onSave,
}: {
  open: boolean;
  habit: Habit | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName]   = useState(habit?.name ?? "");
  const [icon, setIcon]   = useState(habit?.icon ?? "CheckCircle");
  const [color, setColor] = useState(habit?.color ?? "#f97316");
  const [saving, setSaving] = useState(false);

  // Sync state when the habit prop changes (open for edit)
  const [prev, setPrev] = useState<Habit | null>(habit);
  if (habit !== prev) {
    setPrev(habit);
    setName(habit?.name ?? "");
    setIcon(habit?.icon ?? "CheckCircle");
    setColor(habit?.color ?? "#f97316");
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    if (habit) {
      await fetch(`/api/habits/${habit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), icon, color }),
      });
    } else {
      await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), icon, color }),
      });
    }
    setSaving(false);
    setName("");
    onSave();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{habit ? "Изменить привычку" : "Новая привычка"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Медитация"
              maxLength={40}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Иконка</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center transition-all",
                    icon === ic
                      ? "bg-[var(--treker-accent)] text-white scale-105 shadow-md"
                      : "bg-[var(--treker-border)]/40 text-[var(--treker-text-muted)] hover:bg-[var(--treker-border)] hover:text-[var(--treker-text)]"
                  )}
                >
                  <DynamicIcon name={ic} size={16} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Цвет</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-transform",
                    color === c ? "scale-110 ring-2 ring-offset-2 ring-[var(--treker-text)]" : "hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full h-10 bg-[var(--treker-accent)] text-white border-2 border-[var(--treker-accent)] shadow-md hover:bg-[var(--treker-accent)]/90 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "Сохраняем…" : habit ? "Сохранить" : "Добавить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
