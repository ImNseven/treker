"use client";
import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Plus, MoreHorizontal, Archive } from "lucide-react";
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
  return d.toISOString().slice(0, 10);
}

const today = new Date();
const todayKey = toDateKey(today);

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstWeekDay(year: number, month: number) {
  // 0 = Mon … 6 = Sun
  const d = new Date(year, month - 1, 1).getDay();
  return (d + 6) % 7; // convert Sun=0 to Mon=0
}

const ICON_OPTIONS = [
  "Sun", "Moon", "Smile", "Heart", "Footprints", "Waves", "Zap",
  "Coffee", "Book", "Music", "Dumbbell", "Apple", "CheckCircle",
];

const COLOR_OPTIONS = [
  "#f97316", "#ec4899", "#ea580c", "#be123c",
  "#6366f1", "#0ea5e9", "#14b8a6", "#84cc16", "#f59e0b",
];

export default function HabitsPage() {
  const year  = today.getFullYear();
  const month = today.getMonth() + 1;

  const { data: habits = [] } = useSWR<Habit[]>("/api/habits", fetcher);
  const logsKey = `/api/habits/log?year=${year}&month=${month}`;
  const { data: logs = [] } = useSWR<HabitLog[]>(logsKey, fetcher);

  const [modalOpen, setModalOpen] = useState(false);
  const [menuHabit, setMenuHabit] = useState<Habit | null>(null);

  // Build sets for quick lookup
  const todayLogSet = new Set(
    logs.filter(l => toDateKey(new Date(l.day)) === todayKey).map(l => l.habitId)
  );
  const logSet = new Set(logs.map(l => `${l.habitId}-${toDateKey(new Date(l.day))}`));

  async function toggleToday(habitId: string) {
    const checked = !todayLogSet.has(habitId);
    await fetch("/api/habits/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId, day: todayKey, checked }),
    });
    globalMutate(logsKey);
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

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Today strip */}
      <div className="mb-6">
        <p className="text-xs text-[--treker-text-muted] font-medium mb-3">Сегодня</p>
        <div className="flex gap-3 flex-wrap">
          {habits.map((h) => {
            const done = todayLogSet.has(h.id);
            return (
              <div key={h.id} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => toggleToday(h.id)}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm",
                    done
                      ? "text-white shadow-md"
                      : "bg-[--treker-card] border-2 border-[--treker-border] text-[--treker-text-muted]"
                  )}
                  style={done ? { background: `linear-gradient(135deg, ${h.color}, ${h.color}cc)` } : {}}
                  title={h.name}
                >
                  <DynamicIcon name={h.icon} size={24} />
                </button>
                <span className="text-[10px] text-[--treker-text-muted] w-14 text-center truncate">{h.name}</span>
              </div>
            );
          })}
          <button
            onClick={() => setModalOpen(true)}
            className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-dashed border-[--treker-border] text-[--treker-text-muted] hover:border-[--treker-accent] hover:text-[--treker-accent] transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Month grid */}
      <div className="mb-4">
        <p className="text-xs text-[--treker-text-muted] font-medium mb-3">
          {today.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left pr-3 py-1 text-[--treker-text-muted] font-medium whitespace-nowrap w-28">Привычка</th>
                {days.map((d) => (
                  <th key={d} className={cn("w-6 text-center py-1 text-[--treker-text-muted]", d === today.getDate() && "text-[--treker-accent] font-bold")}>
                    {d}
                  </th>
                ))}
                <th className="pl-2 text-center text-[--treker-text-muted] font-medium">🔥</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => {
                const habitLogs = logs.filter(l => l.habitId === h.id);
                const logDates = habitLogs.map(l => new Date(l.day));
                const streak = calcStreak(logDates, today);

                return (
                  <tr key={h.id} className="border-t border-[--treker-border]">
                    <td className="pr-3 py-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <DynamicIcon name={h.icon} size={14} style={{ color: h.color }} />
                        <span className="truncate max-w-[90px] text-[--treker-text]">{h.name}</span>
                        <button onClick={() => setMenuHabit(h)} className="text-[--treker-text-muted] hover:text-[--treker-text] ml-1">
                          <MoreHorizontal size={12} />
                        </button>
                      </div>
                    </td>
                    {days.map((d) => {
                      const key = `${h.id}-${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const cellDate = new Date(year, month - 1, d);
                      const isPast = cellDate < today && toDateKey(cellDate) !== todayKey;
                      const isFuture = cellDate > today;
                      const isLogged = logSet.has(key);

                      return (
                        <td key={d} className="w-6 text-center py-1.5">
                          <div
                            className={cn(
                              "w-4 h-4 rounded-full mx-auto",
                              isLogged     ? "bg-[--treker-accent]"
                              : isFuture   ? ""
                              : isPast     ? "bg-red-100 dark:bg-red-950"
                              : "border border-[--treker-border]"
                            )}
                          />
                        </td>
                      );
                    })}
                    <td className="pl-2 text-center">
                      <span className="font-bold text-[--treker-accent] tnum">{streak}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Habit menu dialog */}
      {menuHabit && (
        <Dialog open={!!menuHabit} onOpenChange={(v) => { if (!v) setMenuHabit(null); }}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>{menuHabit.name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => archiveHabit(menuHabit.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[--treker-text-muted] hover:bg-[--treker-border] transition-colors"
              >
                <Archive size={16} />
                Архивировать
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add habit modal */}
      <HabitModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={() => { globalMutate("/api/habits"); setModalOpen(false); }}
      />
    </div>
  );
}

function HabitModal({
  open, onClose, onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("CheckCircle");
  const [color, setColor] = useState("#f97316");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), icon, color }),
    });
    setSaving(false);
    setName("");
    onSave();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новая привычка</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Медитация"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Иконка</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center border transition-colors",
                    icon === ic
                      ? "border-[--treker-accent] bg-[--treker-accent]/10"
                      : "border-[--treker-border] hover:bg-[--treker-border]"
                  )}
                >
                  <DynamicIcon name={ic} size={16} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Цвет</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    color === c ? "border-[--treker-text] scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full bg-[--treker-accent] hover:bg-[--treker-accent]/90 text-white"
          >
            {saving ? "Сохраняем…" : "Добавить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
