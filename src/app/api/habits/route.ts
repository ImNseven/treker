import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { seedIfEmpty } from "@/lib/seed";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await seedIfEmpty();

  const habits = await db.habit.findMany({
    where: { userId, isArchived: false },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(habits);
}

export async function POST(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const maxOrder = await db.habit.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });

  const habit = await db.habit.create({
    data: {
      userId,
      name: body.name,
      icon: body.icon ?? "CheckCircle",
      color: body.color ?? "#f97316",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  return NextResponse.json(habit, { status: 201 });
}
