import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { habitId, day, checked } = await req.json();
  const dayDate = new Date(day);

  if (checked) {
    await db.habitLog.upsert({
      where: { habitId_day: { habitId, day: dayDate } },
      create: { userId, habitId, day: dayDate },
      update: {},
    });
  } else {
    await db.habitLog.deleteMany({ where: { habitId, day: dayDate } });
  }

  return NextResponse.json({ ok: true });
}

// GET logs for a month: ?year=2026&month=5
export async function GET(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const now = new Date();
  const year  = parseInt(searchParams.get("year")  ?? String(now.getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));

  const from = new Date(year, month - 1, 1);
  const to   = new Date(year, month, 0, 23, 59, 59, 999);

  const logs = await db.habitLog.findMany({
    where: { userId, day: { gte: from, lte: to } },
    orderBy: { day: "asc" },
  });

  return NextResponse.json(logs);
}
