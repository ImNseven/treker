import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// PUT /api/sleep/[id]  { startAt?, endAt? }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const entry = await db.sleepEntry.updateMany({
    where: { id, userId },
    data: {
      startAt: body.startAt !== undefined ? new Date(body.startAt) : undefined,
      endAt:   body.endAt   !== undefined ? new Date(body.endAt)   : undefined,
    },
  });

  if (entry.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.sleepEntry.findUnique({ where: { id } });
  return NextResponse.json(updated);
}

// DELETE /api/sleep/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const deleted = await db.sleepEntry.deleteMany({ where: { id, userId } });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
