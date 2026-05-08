import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const template = await db.quickTemplate.update({
    where: { id },
    data: {
      label:      body.label      !== undefined ? body.label      : undefined,
      amount:     body.amount     !== undefined ? body.amount     : undefined,
      categoryId: body.categoryId !== undefined ? body.categoryId : undefined,
      sortOrder:  body.sortOrder  !== undefined ? body.sortOrder  : undefined,
    },
    include: { category: true },
  });
  return NextResponse.json(template);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.quickTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
