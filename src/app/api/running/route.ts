import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/running                    last 50 entries
//  ?year=2026&month=5                  all runs in that calendar month
//  ?days=10                            runs from the last N days (incl. today)
export async function GET(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const year  = searchParams.get("year");
  const month = searchParams.get("month");
  const days  = searchParams.get("days");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let where: any = { userId };
  let take: number | undefined = 50;

  if (year && month) {
    const y = parseInt(year);
    const m = parseInt(month);
    const from = new Date(y, m - 1, 1);
    const to   = new Date(y, m, 0, 23, 59, 59, 999);
    where = { userId, occurredOn: { gte: from, lte: to } };
    take = undefined;
  } else if (days) {
    const n = Math.max(1, Math.min(365, parseInt(days)));
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1));
    where = { userId, occurredOn: { gte: from } };
    take = undefined;
  }

  const runs = await db.run.findMany({
    where,
    orderBy: { occurredOn: "desc" },
    take,
  });

  return NextResponse.json(runs);
}

// POST /api/running  { occurredOn: "YYYY-MM-DD", distanceKm: number, durationSec: number, note?: string }
export async function POST(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { occurredOn, distanceKm, durationSec, note } = await req.json();

  const run = await db.run.create({
    data: {
      userId,
      occurredOn:  new Date(occurredOn),
      distanceKm,
      durationSec: parseInt(durationSec),
      note:        note ?? null,
    },
  });

  return NextResponse.json(run, { status: 201 });
}
