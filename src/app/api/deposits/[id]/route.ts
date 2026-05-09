import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/deposits/:id — full deposit + transfer history
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const deposit = await db.deposit.findFirst({
    where: { id, userId },
    include: {
      transfers: { orderBy: { occurredOn: "desc" } },
    },
  });
  if (!deposit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const balance = deposit.transfers.reduce((s, t) => s + Number(t.amount), 0);
  return NextResponse.json({ ...deposit, balance });
}

// PUT /api/deposits/:id — edit name/icon/color/goal/archived
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json();

  // Verify ownership
  const exists = await db.deposit.findFirst({ where: { id, userId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.name != null)       data.name = String(body.name).trim();
  if (body.icon != null)       data.icon = String(body.icon);
  if (body.color != null)      data.color = String(body.color);
  if (body.goal !== undefined) data.goal = body.goal != null && body.goal !== "" ? Number(body.goal) : null;
  if (body.isArchived != null) data.isArchived = Boolean(body.isArchived);

  try {
    const updated = await db.deposit.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DB error";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Вклад с таким именем уже есть" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/deposits/:id — hard delete (transfers cascade)
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const exists = await db.deposit.findFirst({ where: { id, userId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.deposit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
