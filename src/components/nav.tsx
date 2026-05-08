"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Wallet,
  CheckCircle,
  Moon,
  Footprints,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/",        icon: Home,        label: "Главная"  },
  { href: "/finance", icon: Wallet,      label: "Финансы"  },
  { href: "/habits",  icon: CheckCircle, label: "Привычки" },
  { href: "/sleep",   icon: Moon,        label: "Сон"      },
  { href: "/running", icon: Footprints,  label: "Бег"      },
  { href: "/work",    icon: Briefcase,   label: "Работа"   },
];

export function Nav({ variant }: { variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();

  if (variant === "sidebar") {
    return (
      <nav className="flex flex-col gap-1 px-3 py-2">
        {LINKS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-[--treker-accent]/10 text-[--treker-accent]"
                : "text-[--treker-text-muted] hover:text-[--treker-text] hover:bg-[--treker-border]"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <div className="flex justify-around items-center h-16 px-2">
      {LINKS.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex flex-col items-center gap-0.5 text-[10px] px-2 py-1",
            pathname === href
              ? "text-[--treker-accent]"
              : "text-[--treker-text-muted]"
          )}
        >
          <Icon size={22} />
          {label}
        </Link>
      ))}
    </div>
  );
}
