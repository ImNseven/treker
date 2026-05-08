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

  const habit = await db.habit.update({
    where: { id },
    data: {
      name:       body.name       !== undefined ? body.name       : undefined,
      icon:       body.icon       !== undefined ? body.icon       : undefined,
      color:      body.color      !== undefined ? body.color      : undefined,
      sortOrder:  body.sortOrder  !== undefined ? body.sortOrder  : undefined,
      isArchived: body.isArchived !== undefined ? body.isArchived : undefined,
    },
  });
  return NextResponse.json(habit);
}
