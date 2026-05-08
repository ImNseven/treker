import { db } from "./db";
import { Kind } from "@prisma/client";

const INCOME_CATEGORIES = [
  { name: "Зарплата ЦСЭ Лаб", icon: "Briefcase",  color: "#ea580c" },
  { name: "Фриланс",           icon: "Laptop",      color: "#f97316" },
  { name: "Подарки",           icon: "Gift",         color: "#ec4899" },
  { name: "Прочее",            icon: "CircleDot",    color: "#a8a29e" },
  { name: "Возвраты",          icon: "RotateCcw",    color: "#fb923c" },
];

const EXPENSE_CATEGORIES = [
  { name: "Еда",                  icon: "ShoppingCart", color: "#be123c" },
  { name: "Вика",                 icon: "Heart",        color: "#ec4899" },
  { name: "Цветы",                icon: "Flower2",      color: "#f43f5e" },
  { name: "Подписки",             icon: "Repeat",       color: "#8b5cf6" },
  { name: "Общага",               icon: "Home",         color: "#0ea5e9" },
  { name: "Проездной",            icon: "Bus",          color: "#14b8a6" },
  { name: "Интернет",             icon: "Wifi",         color: "#6366f1" },
  { name: "Телефон",              icon: "Phone",        color: "#84cc16" },
  { name: "Бассейн",              icon: "Waves",        color: "#0284c7" },
  { name: "Импульс покупки",      icon: "Zap",          color: "#f59e0b" },
  { name: "Неучтённое за месяц",  icon: "HelpCircle",   color: "#a8a29e" },
];

const HABITS = [
  { name: "Утренняя зарядка", icon: "Sun",        color: "#f97316" },
  { name: "Зубы утро",        icon: "Smile",      color: "#0ea5e9" },
  { name: "Зубы вечером",     icon: "Moon",       color: "#6366f1" },
  { name: "Бег",              icon: "Footprints", color: "#ea580c" },
  { name: "Бассейн",          icon: "Waves",      color: "#0284c7" },
];

export async function seedIfEmpty() {
  const count = await db.category.count({ where: { userId: "owner" } });
  if (count > 0) return;

  await db.$transaction([
    ...INCOME_CATEGORIES.map((c, i) =>
      db.category.create({
        data: { userId: "owner", kind: Kind.income, sortOrder: i, ...c },
      })
    ),
    ...EXPENSE_CATEGORIES.map((c, i) =>
      db.category.create({
        data: { userId: "owner", kind: Kind.expense, sortOrder: i, ...c },
      })
    ),
    ...HABITS.map((h, i) =>
      db.habit.create({
        data: { userId: "owner", sortOrder: i, ...h },
      })
    ),
  ]);
}
