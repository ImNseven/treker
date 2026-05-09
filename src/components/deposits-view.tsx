"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Plus, PiggyBank, Trash2, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicIcon } from "@/components/dynamic-icon";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── Types (loosely typed since Decimal arrives as string from JSON) ─────────
interface DepositSummary {
  id: string;
  name: string;
  icon: string;
  color: string;
  goal: number | string | null;
  isArchived: boolean;
  createdAt: string;
  balance: number;
  lastTopUpAt: string | null;
  transferCount: number;
}

interface DepositTransfer {
  id: string;
  depositId: string;
  amount: number | string;
  note: string | null;
  occurredOn: string;
  createdAt: string;
}

interface DepositDetail extends DepositSummary {
  transfers: DepositTransfer[];
}

// ── Icon palette for the create form ────────────────────────────────────────
const ICONS = [
  "PiggyBank", "Wallet", "Target", "TrendingUp", "Coins", "Banknote",
  "Landmark", "Plane", "Home", "Heart", "Gift",
];

const COLORS = [
  "#16a34a", "#0ea5e9", "#8b5cf6", "#ec4899",
  "#f97316", "#eab308", "#14b8a6", "#a855f7",
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number | string) {
  return Number(n).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const ms = now.getTime() - d.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7) return `${days} дн. назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ── Main view ───────────────────────────────────────────────────────────────
export function DepositsView() {
  const apiKey = "/api/deposits";
  const { data: deposits = [], isLoading } = useSWR<DepositSummary[]>(apiKey, fetcher);

  const [createOpen, setCreateOpen] = useState(false);
  const [openDepositId, setOpenDepositId] = useState<string | null>(null);

  const totalBalance = useMemo(
    () => deposits.reduce((s, d) => s + Number(d.balance), 0),
    [deposits]
  );

  return (
    <div className="space-y-3">
      {/* Total + create button */}
      <div className="bg-[var(--treker-card)] rounded-[var(--treker-radius-card)] shadow-[var(--treker-shadow-card)] p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--treker-text-muted)] mb-0.5">Всего на вкладах</p>
          <p className="text-xl font-bold tnum">
            {fmt(totalBalance)} <span className="text-xs font-medium text-[var(--treker-text-muted)]">BYN</span>
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[var(--treker-accent)] hover:bg-[var(--treker-accent)]/90 text-white border-2 border-[var(--treker-accent)] shadow-md gap-1.5"
          size="sm"
        >
          <Plus size={16} />
          Создать
        </Button>
      </div>

      {/* Empty state */}
      {!isLoading && deposits.length === 0 && (
        <div className="bg-[var(--treker-card)] rounded-[var(--treker-radius-card)] border border-[var(--treker-border)] py-12 text-center">
          <PiggyBank
            size={36}
            className="mx-auto mb-2 text-[var(--treker-text-muted)]"
            strokeWidth={1.5}
          />
          <p className="text-sm text-[var(--treker-text-muted)]">
            Пока нет вкладов. Создайте первый — например «Подушка» или «На отпуск».
          </p>
        </div>
      )}

      {/* Deposit cards */}
      {deposits.map((d) => {
        const goal = d.goal != null ? Number(d.goal) : null;
        const progress = goal && goal > 0 ? Math.min(100, (d.balance / goal) * 100) : null;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => setOpenDepositId(d.id)}
            className="w-full text-left bg-[var(--treker-card)] rounded-[var(--treker-radius-card)] shadow-[var(--treker-shadow-card)] p-4 transition-all hover:scale-[1.005] hover:shadow-lg active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: d.color }}
              >
                <DynamicIcon name={d.icon} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{d.name}</p>
                <p className="text-xs text-[var(--treker-text-muted)]">
                  Последнее пополнение: {formatRelativeDate(d.lastTopUpAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold tnum">{fmt(d.balance)}</p>
                {goal && (
                  <p className="text-[11px] text-[var(--treker-text-muted)] tnum">
                    / {fmt(goal)} BYN
                  </p>
                )}
              </div>
            </div>
            {progress != null && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--treker-border)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${progress}%`, backgroundColor: d.color }}
                  />
                </div>
                <span className="text-[11px] text-[var(--treker-text-muted)] tnum w-10 text-right">
                  {progress.toFixed(0)}%
                </span>
              </div>
            )}
          </button>
        );
      })}

      {/* Modals */}
      <CreateDepositModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { globalMutate(apiKey); setCreateOpen(false); }}
      />
      {openDepositId && (
        <DepositDetailModal
          depositId={openDepositId}
          onClose={() => setOpenDepositId(null)}
          onChanged={() => globalMutate(apiKey)}
        />
      )}
    </div>
  );
}

// ── Create deposit modal ────────────────────────────────────────────────────
function CreateDepositModal({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName]   = useState("");
  const [icon, setIcon]   = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [goal, setGoal]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  function reset() {
    setName(""); setIcon(ICONS[0]); setColor(COLORS[0]); setGoal(""); setError(null);
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) { setError("Введите название"); return; }
    setSaving(true);
    const res = await fetch("/api/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        icon,
        color,
        goal: goal ? parseFloat(goal) : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Ошибка сохранения");
      return;
    }
    reset();
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Новый вклад</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: На отпуск"
              maxLength={40}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Иконка</Label>
            <div className="grid grid-cols-6 gap-1.5">
              {ICONS.map((ic) => (
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
                  <DynamicIcon name={ic} size={18} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Цвет</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
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

          <div className="space-y-1.5">
            <Label>Цель <span className="text-[var(--treker-text-muted)] font-normal">(необязательно)</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="0.00"
              className="tnum"
            />
          </div>

          {error && <p className="text-xs text-[var(--treker-expense)]">{error}</p>}

          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full h-10 bg-[var(--treker-accent)] text-white border-2 border-[var(--treker-accent)] shadow-md hover:bg-[var(--treker-accent)]/90 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "Сохраняем…" : "Создать вклад"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Deposit detail modal ────────────────────────────────────────────────────
function DepositDetailModal({
  depositId, onClose, onChanged,
}: {
  depositId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const apiKey = `/api/deposits/${depositId}`;
  const { data: deposit, isLoading } = useSWR<DepositDetail>(apiKey, fetcher);

  const [topUpKind, setTopUpKind] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [note, setNote]     = useState("");
  const [date, setDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy]     = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleAddTransfer() {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setBusy(true);
    await fetch(`/api/deposits/${depositId}/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: topUpKind === "in" ? amt : -amt,
        note: note.trim() || null,
        occurredOn: date,
      }),
    });
    setBusy(false);
    setAmount(""); setNote("");
    globalMutate(apiKey);
    onChanged();
  }

  async function handleDeleteTransfer(transferId: string) {
    setBusy(true);
    await fetch(`/api/deposits/${depositId}/transfers/${transferId}`, { method: "DELETE" });
    setBusy(false);
    globalMutate(apiKey);
    onChanged();
  }

  async function handleDeleteDeposit() {
    setBusy(true);
    await fetch(`/api/deposits/${depositId}`, { method: "DELETE" });
    setBusy(false);
    onChanged();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            {deposit && (
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: deposit.color }}
              >
                <DynamicIcon name={deposit.icon} size={16} />
              </span>
            )}
            <span className="truncate">{deposit?.name ?? "Загрузка…"}</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading || !deposit ? (
          <p className="text-sm text-[var(--treker-text-muted)] py-8 text-center">Загрузка…</p>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Balance + goal */}
            <div className="text-center py-2">
              <p className="text-xs text-[var(--treker-text-muted)] mb-1">Текущий баланс</p>
              <p
                className="text-3xl font-bold tnum"
                style={{ color: deposit.balance >= 0 ? deposit.color : "var(--treker-expense)" }}
              >
                {fmt(deposit.balance)} <span className="text-base font-medium text-[var(--treker-text-muted)]">BYN</span>
              </p>
              {deposit.goal != null && (
                <p className="text-xs text-[var(--treker-text-muted)] tnum mt-1">
                  Цель: {fmt(deposit.goal)} BYN
                  {Number(deposit.goal) > 0 && (
                    <span className="ml-1.5">
                      ({Math.min(100, (deposit.balance / Number(deposit.goal)) * 100).toFixed(0)}%)
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Add transfer form */}
            <div className="border-2 border-[var(--treker-border)] rounded-xl p-3 space-y-3">
              <div className="flex gap-2">
                {(["in", "out"] as const).map((k) => {
                  const active = topUpKind === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTopUpKind(k)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-sm font-medium border-2 outline-none flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-[0.97]",
                        active
                          ? k === "in"
                            ? "bg-[var(--treker-income)] text-white border-[var(--treker-income)] shadow-sm"
                            : "bg-[var(--treker-expense)] text-white border-[var(--treker-expense)] shadow-sm"
                          : "border-[var(--treker-border)] text-[var(--treker-text-muted)] hover:bg-[var(--treker-border)]/40"
                      )}
                    >
                      {k === "in" ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                      {k === "in" ? "Пополнить" : "Снять"}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="tnum"
                />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Заметка (необязательно)"
              />

              <Button
                onClick={handleAddTransfer}
                disabled={busy || !amount || parseFloat(amount) <= 0}
                className="w-full bg-[var(--treker-accent)] text-white border-2 border-[var(--treker-accent)] shadow-sm hover:bg-[var(--treker-accent)]/90 active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? "Сохраняем…" : topUpKind === "in" ? "Пополнить" : "Снять"}
              </Button>
            </div>

            {/* Transfer history */}
            <div>
              <p className="text-xs text-[var(--treker-text-muted)] font-medium mb-2">
                История пополнений ({deposit.transfers.length})
              </p>
              {deposit.transfers.length === 0 ? (
                <p className="text-xs text-[var(--treker-text-muted)] text-center py-4">
                  Пока нет пополнений
                </p>
              ) : (
                <div className="space-y-1.5">
                  {deposit.transfers.map((t) => {
                    const amt = Number(t.amount);
                    const isIn = amt >= 0;
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--treker-border)]"
                      >
                        <div
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0",
                            isIn ? "bg-[var(--treker-income)]" : "bg-[var(--treker-expense)]"
                          )}
                        >
                          {isIn ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {t.note || (isIn ? "Пополнение" : "Снятие")}
                          </p>
                          <p className="text-[11px] text-[var(--treker-text-muted)]">
                            {formatDate(t.occurredOn)}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "text-sm font-semibold tnum",
                            isIn ? "text-[var(--treker-income)]" : "text-[var(--treker-expense)]"
                          )}
                        >
                          {isIn ? "+" : "−"}{fmt(Math.abs(amt))}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDeleteTransfer(t.id)}
                          className="text-[var(--treker-text-muted)] hover:text-[var(--treker-expense)] p-1"
                          aria-label="Удалить пополнение"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delete deposit */}
            <div className="pt-2 border-t border-[var(--treker-border)]">
              {confirmDelete ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setConfirmDelete(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={handleDeleteDeposit}
                    disabled={busy}
                    className="flex-1 bg-[var(--treker-expense)] text-white hover:bg-[var(--treker-expense)]/90 border-2 border-[var(--treker-expense)]"
                  >
                    Удалить вклад
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-xs text-[var(--treker-text-muted)] hover:text-[var(--treker-expense)] py-2 transition-colors"
                >
                  Удалить вклад со всей историей
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

