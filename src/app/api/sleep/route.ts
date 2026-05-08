import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/sleep?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const now = new Date();

  // Default: last 30 days
  const toDate = searchParams.get("to")
    ? new Date(searchParams.get("to")!)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const fromDate = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : new Date(toDate.getTime() - 29 * 24 * 60 * 60 * 1000);

  const entries = await db.sleepEntry.findMany({
    where: {
      userId,
      startAt: { gte: fromDate },
      endAt:   { lte: new Date(toDate.getTime() + 24 * 60 * 60 * 1000) },
    },
    orderBy: { startAt: "desc" },
  });

  return NextResponse.json(entries);
}

// POST /api/sleep  { startAt: ISO, endAt: ISO }
export async function POST(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { startAt, endAt } = await req.json();

  const entry = await db.sleepEntry.create({
    data: {
      userId,
      startAt: new Date(startAt),
      endAt:   new Date(endAt),
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
