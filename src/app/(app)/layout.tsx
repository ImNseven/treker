import Link from "next/link";
import { Settings } from "lucide-react";
import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[--treker-bg]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-[--treker-border] shrink-0 bg-[--treker-bg]">
        <div className="flex items-center justify-between px-6 py-5">
          <span className="text-lg font-bold tracking-tight text-[--treker-text]">Treker</span>
          <Link
            href="/settings"
            className="text-[--treker-text-muted] hover:text-[--treker-text] transition-colors"
            aria-label="Настройки"
          >
            <Settings size={18} />
          </Link>
        </div>
        <Nav variant="sidebar" />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 min-w-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-[--treker-border] bg-[--treker-card] z-50">
        <Nav variant="bottom" />
      </nav>
    </div>
  );
}
