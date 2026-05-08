import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// PUT /api/running/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const result = await db.run.updateMany({
    where: { id, userId },
    data: {
      occurredOn:  body.occurredOn  !== undefined ? new Date(body.occurredOn) : undefined,
      distanceKm:  body.distanceKm  !== undefined ? body.distanceKm           : undefined,
      durationSec: body.durationSec !== undefined ? parseInt(body.durationSec): undefined,
      note:        body.note        !== undefined ? body.note                  : undefined,
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.run.findUnique({ where: { id } });
  return NextResponse.json(updated);
}

// DELETE /api/running/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await db.run.deleteMany({ where: { id, userId } });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
