import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/running?year=2026&month=5  (or no params → last 50 entries)
export async function GET(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const year  = searchParams.get("year");
  const month = searchParams.get("month");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let where: any = { userId };

  if (year && month) {
    const y = parseInt(year);
    const m = parseInt(month);
    const from = new Date(y, m - 1, 1);
    const to   = new Date(y, m, 0, 23, 59, 59, 999);
    where = { userId, occurredOn: { gte: from, lte: to } };
  }

  const runs = await db.run.findMany({
    where,
    orderBy: { occurredOn: "desc" },
    take: year && month ? undefined : 50,
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
