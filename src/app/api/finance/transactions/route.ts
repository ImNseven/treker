import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { Kind } from "@prisma/client";
import { seedIfEmpty } from "@/lib/seed";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await seedIfEmpty();

  const { searchParams } = req.nextUrl;
  const now = new Date();
  const year  = parseInt(searchParams.get("year")  ?? String(now.getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));

  const from = new Date(year, month - 1, 1);
  const to   = new Date(year, month, 0, 23, 59, 59, 999);

  const rows = await db.transaction.findMany({
    where: { userId, occurredOn: { gte: from, lte: to } },
    include: { category: true },
    orderBy: { occurredOn: "desc" },
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const tx = await db.transaction.create({
    data: {
      userId,
      categoryId: body.categoryId,
      kind: body.kind as Kind,
      amount: body.amount,
      note: body.note ?? null,
      occurredOn: new Date(body.occurredOn),
    },
    include: { category: true },
  });
  return NextResponse.json(tx, { status: 201 });
}
