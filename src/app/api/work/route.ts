import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/work?year=2026&month=5
export async function GET(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const now   = new Date();
  const year  = parseInt(searchParams.get("year")  ?? String(now.getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));

  const from = new Date(year, month - 1, 1);
  const to   = new Date(year, month, 0, 23, 59, 59, 999);

  const days = await db.workDay.findMany({
    where: { userId, day: { gte: from, lte: to } },
    orderBy: { day: "asc" },
  });

  return NextResponse.json(days);
}

// POST /api/work  { day: "YYYY-MM-DD", hours: number, description?: string }
// Upserts by (userId, day)
export async function POST(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { day, hours, description } = await req.json();
  const dayDate = new Date(day);

  const workDay = await db.workDay.upsert({
    where: { userId_day: { userId, day: dayDate } },
    create: { userId, day: dayDate, hours, description: description ?? null },
    update: { hours, description: description ?? null },
  });

  return NextResponse.json(workDay);
}

// DELETE /api/work  { day: "YYYY-MM-DD" }
export async function DELETE(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { day } = await req.json();
  const dayDate = new Date(day);

  await db.workDay.deleteMany({ where: { userId, day: dayDate } });

  return NextResponse.json({ ok: true });
}
