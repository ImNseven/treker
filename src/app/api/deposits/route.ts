import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/deposits — list all (non-archived) with computed balance + last transfer date
export async function GET() {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deposits = await db.deposit.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      transfers: {
        select: { amount: true, occurredOn: true },
        orderBy: { occurredOn: "desc" },
      },
    },
  });

  const result = deposits.map((d) => {
    const balance = d.transfers.reduce((s, t) => s + Number(t.amount), 0);
    const lastTopUpAt = d.transfers[0]?.occurredOn ?? null;
    const transferCount = d.transfers.length;
    // strip transfer list from response — we only ship summary on the list endpoint
    const { transfers: _t, ...rest } = d;
    void _t;
    return { ...rest, balance, lastTopUpAt, transferCount };
  });

  return NextResponse.json(result);
}

// POST /api/deposits — create
export async function POST(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, icon, color, goal } = await req.json();

  if (!name || !icon || !color) {
    return NextResponse.json({ error: "name, icon, color required" }, { status: 400 });
  }

  // Take next sortOrder
  const last = await db.deposit.findFirst({
    where: { userId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  try {
    const created = await db.deposit.create({
      data: {
        userId,
        name: String(name).trim(),
        icon: String(icon),
        color: String(color),
        goal: goal != null && goal !== "" ? Number(goal) : null,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DB error";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Вклад с таким именем уже есть" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
