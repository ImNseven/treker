"use client";
import { useState, useEffect, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Plus, ChevronLeft, ChevronRight, MoreHorizontal, Trash2, List, BarChart3, PiggyBank } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepositsView } from "@/components/deposits-view";
import type { Category, Transaction, QuickTemplate } from "@prisma/client";

function pluralizeTx(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "транзакция";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "транзакции";
  return "транзакций";
}

type TxWithCat = Transaction & { category: Category };
type TplWithCat = QuickTemplate & { category: Category };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatAmount(n: any) {
  return Number(n).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function groupByDate(txs: TxWithCat[]) {
  const map = new Map<string, TxWithCat[]>();
  for (const tx of txs) {
    const key = new Date(tx.occurredOn).toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return map;
}

export default function FinancePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [tab, setTab] = useState<"all" | "income" | "expense">("all");
  const [view, setView] = useState<"list" | "stats" | "deposits">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<TxWithCat | null>(null);
  const [undoTimer, setUndoTimer] = useState<{ id: string; timeout: ReturnType<typeof setTimeout> } | null>(null);

  const txKey = `/api/finance/transactions?year=${year}&month=${month}`;
  const { data: transactions = [] } = useSWR<TxWithCat[]>(txKey, fetcher);
  const { data: categories = [] } = useSWR<Category[]>("/api/finance/categories", fetcher);
  const { data: templates = [] } = useSWR<TplWithCat[]>("/api/finance/templates", fetcher);

  const filtered = transactions.filter((tx) =>
    tab === "all" ? true : tx.kind === tab
  );

  const income  = transactions.filter(t => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter(t => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  const monthLabel = new Date(year, month - 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  async function applyTemplate(tpl: TplWithCat) {
    const res = await fetch("/api/finance/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: tpl.categoryId,
        kind: tpl.kind,
        amount: tpl.amount,
        note: tpl.label,
        occurredOn: new Date().toISOString().slice(0, 10),
      }),
    });
    if (res.ok) {
      const newTx = await res.json();
      globalMutate(txKey);
      // 5-second undo
      const timeout = setTimeout(() => setUndoTimer(null), 5000);
      setUndoTimer({ id: newTx.id, timeout });
    }
  }

  async function undoTemplate() {
    if (!undoTimer) return;
    clearTimeout(undoTimer.timeout);
    await fetch(`/api/finance/transactions/${undoTimer.id}`, { method: "DELETE" });
    globalMutate(txKey);
    setUndoTimer(null);
  }

  async function deleteTx(id: string) {
    await fetch(`/api/finance/transactions/${id}`, { method: "DELETE" });
    globalMutate(txKey);
  }

  const grouped = groupByDate(filtered);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Summary */}
      <div className="bg-[var(--treker-card)] rounded-[var(--treker-radius-card)] p-4 shadow-[var(--treker-shadow-card)] mb-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1 rounded-md hover:bg-[var(--treker-border)] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-sm capitalize">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 rounded-md hover:bg-[var(--treker-border)] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-[var(--treker-text-muted)] mb-0.5">Доходы</p>
            <p className="text-lg font-bold tnum text-[var(--treker-income)]">+{formatAmount(income)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--treker-text-muted)] mb-0.5">Расходы</p>
            <p className="text-lg font-bold tnum text-[var(--treker-expense)]">−{formatAmount(expense)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--treker-text-muted)] mb-0.5">Баланс</p>
            <p className={cn("text-lg font-bold tnum", balance >= 0 ? "text-[var(--treker-income)]" : "text-[var(--treker-expense)]")}>
              {balance >= 0 ? "+" : ""}{formatAmount(balance)}
            </p>
          </div>
        </div>
        <p className="text-xs text-[var(--treker-text-muted)] mt-1 text-right">BYN</p>
      </div>

      {/* Quick templates */}
      {templates.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-[var(--treker-text-muted)] mb-2">Быстрый ввод</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="shrink-0 px-3 py-1.5 rounded-full border border-[var(--treker-border)] text-sm whitespace-nowrap hover:bg-[var(--treker-border)] transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Undo toast */}
      {undoTimer && (
        <div className="mb-4 flex items-center justify-between bg-[var(--treker-card)] border border-[var(--treker-border)] rounded-lg px-4 py-2 shadow-[var(--treker-shadow-card)]">
          <span className="text-sm">Транзакция добавлена</span>
          <button onClick={undoTemplate} className="text-sm font-medium text-[var(--treker-accent)] ml-4">Отменить</button>
        </div>
      )}

      {/* View toggle: list / stats / deposits */}
      <div className="flex gap-1 p-1 mb-4 rounded-lg bg-[var(--treker-card)] border border-[var(--treker-border)]">
        {([
          { v: "list",     icon: List,       label: "Список"     },
          { v: "stats",    icon: BarChart3,  label: "Статистика" },
          { v: "deposits", icon: PiggyBank,  label: "Вклады"     },
        ] as const).map(({ v, icon: Icon, label }) => {
          const active = view === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all duration-150 active:scale-[0.98]",
                active
                  ? "bg-[var(--treker-accent)] text-white shadow-sm"
                  : "text-[var(--treker-text-muted)] hover:text-[var(--treker-text)] hover:bg-[var(--treker-border)]/40"
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {view === "stats" ? (
        <StatsView transactions={transactions} monthLabel={monthLabel} />
      ) : view === "deposits" ? (
        <DepositsView />
      ) : (
        <>
      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">Все</TabsTrigger>
          <TabsTrigger value="income" className="flex-1">Доходы</TabsTrigger>
          <TabsTrigger value="expense" className="flex-1">Расходы</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Transaction list */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <p className="text-center text-[var(--treker-text-muted)] text-sm py-8">Нет транзакций</p>
        )}
        {Array.from(grouped.entries()).map(([dateKey, txs]) => (
          <div key={dateKey}>
            <p className="text-xs text-[var(--treker-text-muted)] font-medium mb-2">
              {formatDate(dateKey)}
            </p>
            <div className="bg-[var(--treker-card)] rounded-[var(--treker-radius-card)] shadow-[var(--treker-shadow-card)] divide-y divide-[var(--treker-border)]">
              {txs.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 text-sm font-bold",
                      tx.kind === "income"
                        ? "bg-[var(--treker-income)]"
                        : "bg-[var(--treker-expense)]"
                    )}
                    aria-label={tx.kind === "income" ? "Доход" : "Расход"}
                  >
                    {tx.kind === "income" ? "Д" : "Р"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.category.name}</p>
                    {tx.note && <p className="text-xs text-[var(--treker-text-muted)] truncate">{tx.note}</p>}
                  </div>
                  <p className={cn("font-semibold tnum text-sm shrink-0", tx.kind === "income" ? "text-[var(--treker-income)]" : "text-[var(--treker-expense)]")}>
                    {tx.kind === "income" ? "+" : "−"}{formatAmount(tx.amount)}
                  </p>
                  <button
                    onClick={() => { setEditTx(tx); setModalOpen(true); }}
                    className="text-[var(--treker-text-muted)] hover:text-[var(--treker-text)] p-1"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      </>
      )}

      {/* FAB */}
      <button
        onClick={() => { setEditTx(null); setModalOpen(true); }}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-[var(--treker-accent)] text-white shadow-lg flex items-center justify-center z-40 hover:opacity-90 transition-opacity"
        aria-label="Добавить транзакцию"
      >
        <Plus size={24} />
      </button>

      {/* Add/Edit modal */}
      <TxModal
        open={modalOpen}
        tx={editTx}
        categories={categories}
        onClose={() => { setModalOpen(false); setEditTx(null); }}
        onSave={() => { globalMutate(txKey); setModalOpen(false); setEditTx(null); }}
        onDelete={() => { if (editTx) deleteTx(editTx.id); setModalOpen(false); setEditTx(null); }}
      />
    </div>
  );
}

function TxModal({
  open, tx, categories, onClose, onSave, onDelete,
}: {
  open: boolean;
  tx: TxWithCat | null;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(today);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tx) {
      setKind(tx.kind as "income" | "expense");
      setCategoryId(tx.categoryId);
      setAmount(String(tx.amount));
      setOccurredOn(new Date(tx.occurredOn).toISOString().slice(0, 10));
      setNote(tx.note ?? "");
    } else {
      setKind("expense");
      setCategoryId("");
      setAmount("");
      setOccurredOn(today);
      setNote("");
    }
  }, [tx, open]);

  const filteredCats = categories.filter((c) => c.kind === kind);

  async function handleSave() {
    if (!categoryId || !amount) return;
    setSaving(true);
    const url = tx ? `/api/finance/transactions/${tx.id}` : "/api/finance/transactions";
    const method = tx ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, kind, amount: parseFloat(amount), occurredOn, note: note || null }),
    });
    setSaving(false);
    onSave();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tx ? "Редактировать" : "Добавить транзакцию"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Kind toggle */}
          <div className="flex gap-2">
            {(["expense", "income"] as const).map((k) => {
              const active = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setKind(k); setCategoryId(""); }}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-medium border-2 outline-none",
                    "transition-[transform,box-shadow,background-color,color,border-color] duration-150 ease-out",
                    "active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--treker-accent)]/40",
                    active
                      ? k === "income"
                        ? "bg-[var(--treker-income)] text-white border-[var(--treker-income)] shadow-md scale-[1.03]"
                        : "bg-[var(--treker-expense)] text-white border-[var(--treker-expense)] shadow-md scale-[1.03]"
                      : "border-[var(--treker-border)] text-[var(--treker-text-muted)] hover:border-[var(--treker-text-muted)]/60 hover:bg-[var(--treker-border)]/40 hover:text-[var(--treker-text)]"
                  )}
                >
                  {k === "income" ? "Доход" : "Расход"}
                </button>
              );
            })}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Категория</Label>
            <Select value={categoryId || undefined} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger>
                <SelectValue>
                  {(value) =>
                    value
                      ? (filteredCats.find((c) => c.id === value)?.name ??
                          categories.find((c) => c.id === value)?.name ??
                          "—")
                      : <span className="text-muted-foreground">Выберите категорию</span>
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {filteredCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Сумма (BYN)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="tnum"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Дата</Label>
            <Input
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>Заметка (необязательно)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Например: продукты на неделю"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-[var(--treker-border)] mt-2">
            {tx && (
              <button
                type="button"
                onClick={onDelete}
                aria-label="Удалить"
                className="p-2 rounded-lg border-2 border-[var(--treker-border)] text-[var(--treker-expense)] transition-all hover:bg-[var(--treker-expense)]/10 hover:border-[var(--treker-expense)]/40 active:scale-95"
              >
                <Trash2 size={18} />
              </button>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !categoryId || !amount}
              className="flex-1 h-10 bg-[var(--treker-accent)] text-white border-2 border-[var(--treker-accent)] shadow-md transition-all hover:bg-[var(--treker-accent)]/90 hover:shadow-lg active:scale-[0.98] disabled:shadow-none disabled:opacity-60"
            >
              {saving ? "Сохраняем…" : tx ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Stats view ───────────────────────────────────────────────────────────────

function StatsView({
  transactions,
  monthLabel,
}: {
  transactions: TxWithCat[];
  monthLabel: string;
}) {
  const [statsKind, setStatsKind] = useState<"expense" | "income">("expense");

  const filtered = transactions.filter((t) => t.kind === statsKind);
  const total = filtered.reduce((s, t) => s + Number(t.amount), 0);

  const byCategory = useMemo(() => {
    const map = new Map<string, { category: Category; total: number; count: number }>();
    for (const tx of filtered) {
      const cur = map.get(tx.categoryId);
      if (cur) {
        cur.total += Number(tx.amount);
        cur.count += 1;
      } else {
        map.set(tx.categoryId, { category: tx.category, total: Number(tx.amount), count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const accent = statsKind === "income" ? "var(--treker-income)" : "var(--treker-expense)";

  return (
    <div className="space-y-4">
      {/* Kind toggle */}
      <div className="flex gap-2">
        {(["expense", "income"] as const).map((k) => {
          const active = statsKind === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setStatsKind(k)}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium border-2 outline-none",
                "transition-[transform,box-shadow,background-color,color,border-color] duration-150 ease-out",
                "active:scale-[0.97]",
                active
                  ? k === "income"
                    ? "bg-[var(--treker-income)] text-white border-[var(--treker-income)] shadow-md scale-[1.02]"
                    : "bg-[var(--treker-expense)] text-white border-[var(--treker-expense)] shadow-md scale-[1.02]"
                  : "border-[var(--treker-border)] text-[var(--treker-text-muted)] hover:border-[var(--treker-text-muted)]/60 hover:bg-[var(--treker-border)]/40 hover:text-[var(--treker-text)]"
              )}
            >
              {k === "income" ? "Доходы" : "Расходы"}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[var(--treker-card)] rounded-[var(--treker-radius-card)] shadow-[var(--treker-shadow-card)] py-12 text-center">
          <p className="text-sm text-[var(--treker-text-muted)]">
            Нет {statsKind === "income" ? "доходов" : "расходов"} за {monthLabel.toLowerCase()}
          </p>
        </div>
      ) : (
        <>
          {/* Donut chart with center label */}
          <div className="bg-[var(--treker-card)] rounded-[var(--treker-radius-card)] shadow-[var(--treker-shadow-card)] p-4">
            <div className="relative h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="total"
                    nameKey={(d) => d.category.name}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={byCategory.length > 1 ? 2 : 0}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {byCategory.map((b) => (
                      <Cell key={b.category.id} fill={b.category.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] uppercase tracking-wide text-[var(--treker-text-muted)]">
                  {statsKind === "income" ? "Доходы" : "Расходы"}
                </span>
                <span className="text-2xl font-bold tnum mt-0.5" style={{ color: accent }}>
                  {statsKind === "income" ? "+" : "−"}
                  {formatAmount(total)}
                </span>
                <span className="text-[11px] text-[var(--treker-text-muted)] tnum mt-0.5">
                  {filtered.length} {pluralizeTx(filtered.length)} · BYN
                </span>
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="space-y-2">
            {byCategory.map((b) => {
              const pct = total > 0 ? (b.total / total) * 100 : 0;
              return (
                <div
                  key={b.category.id}
                  className="bg-[var(--treker-card)] border border-[var(--treker-border)] rounded-xl p-3 shadow-[var(--treker-shadow-card)]"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: b.category.color }}
                    />
                    <span className="flex-1 text-sm font-medium truncate">{b.category.name}</span>
                    <span className="text-sm font-semibold tnum" style={{ color: accent }}>
                      {statsKind === "income" ? "+" : "−"}
                      {formatAmount(b.total)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--treker-border)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width] duration-300 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: b.category.color }}
                      />
                    </div>
                    <span className="text-[11px] text-[var(--treker-text-muted)] tnum w-8 text-right">
                      {pct.toFixed(0)}%
                    </span>
                    <span className="text-[11px] text-[var(--treker-text-muted)] tnum w-8 text-right">
                      {b.count}×
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
