import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { Kind } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const kind = searchParams.get("kind") as Kind | null;

  const templates = await db.quickTemplate.findMany({
    where: { userId, ...(kind ? { kind } : {}) },
    include: { category: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const maxOrder = await db.quickTemplate.aggregate({
    where: { userId, kind: body.kind },
    _max: { sortOrder: true },
  });

  const template = await db.quickTemplate.create({
    data: {
      userId,
      kind: body.kind as Kind,
      categoryId: body.categoryId,
      amount: body.amount,
      label: body.label,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    include: { category: true },
  });
  return NextResponse.json(template, { status: 201 });
}
