"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon, Monitor, Download, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light",  label: "Светлая", Icon: Sun },
  { value: "dark",   label: "Тёмная",  Icon: Moon },
  { value: "system", label: "Системная", Icon: Monitor },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "DELETE" });
    router.push("/login");
  }

  function handleExport() {
    setExporting(true);
    // Trigger file download
    const a = document.createElement("a");
    a.href = "/api/export";
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setExporting(false), 1500);
  }

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-[var(--treker-text)] mb-6">Настройки</h1>

      {/* Theme */}
      <section className="mb-6">
        <p className="text-xs text-[var(--treker-text-muted)] font-medium mb-3 uppercase tracking-wide">Тема</p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm",
                mounted && theme === value
                  ? "border-[var(--treker-accent)] bg-[var(--treker-accent)]/10 text-[var(--treker-accent)]"
                  : "border-[var(--treker-border)] text-[var(--treker-text-muted)] hover:border-[var(--treker-accent)]/40"
              )}
            >
              <Icon size={20} />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Data */}
      <section className="mb-6">
        <p className="text-xs text-[var(--treker-text-muted)] font-medium mb-3 uppercase tracking-wide">Данные</p>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-[var(--treker-border)] text-[var(--treker-text)]"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download size={16} className="text-[var(--treker-accent)]" />
            {exporting ? "Подготовка…" : "Экспортировать данные (JSON)"}
          </Button>
        </div>
      </section>

      {/* Account */}
      <section>
        <p className="text-xs text-[var(--treker-text-muted)] font-medium mb-3 uppercase tracking-wide">Аккаунт</p>
        <Button
          variant="outline"
          className="w-full justify-start gap-3 border-[var(--treker-border)] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut size={16} />
          {loggingOut ? "Выходим…" : "Выйти"}
        </Button>
      </section>

      {/* Version */}
      <p className="mt-10 text-center text-xs text-[var(--treker-text-muted)] opacity-50">
        Treker v0.1 · Личный трекер
      </p>
    </div>
  );
}
