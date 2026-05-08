import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { Kind } from "@prisma/client";

export const runtime = "nodejs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const tx = await db.transaction.update({
    where: { id },
    data: {
      categoryId: body.categoryId,
      kind: body.kind as Kind,
      amount: body.amount,
      note: body.note ?? null,
      occurredOn: new Date(body.occurredOn),
    },
    include: { category: true },
  });
  return NextResponse.json(tx);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
