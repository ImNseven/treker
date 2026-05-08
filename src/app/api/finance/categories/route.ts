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
  const kind = searchParams.get("kind") as Kind | null;

  const categories = await db.category.findMany({
    where: {
      userId,
      isArchived: false,
      ...(kind ? { kind } : {}),
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const maxOrder = await db.category.aggregate({
    where: { userId, kind: body.kind },
    _max: { sortOrder: true },
  });

  const category = await db.category.create({
    data: {
      userId,
      kind: body.kind as Kind,
      name: body.name,
      icon: body.icon ?? "CircleDot",
      color: body.color ?? "#a8a29e",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  return NextResponse.json(category, { status: 201 });
}
