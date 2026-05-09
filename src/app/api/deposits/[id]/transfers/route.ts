import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// POST /api/deposits/:id/transfers — add a top-up (positive) or withdrawal (negative)
// body: { amount: number, note?: string, occurredOn?: "YYYY-MM-DD" }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: depositId } = await ctx.params;

  // Verify ownership
  const deposit = await db.deposit.findFirst({
    where: { id: depositId, userId },
    select: { id: true },
  });
  if (!deposit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { amount, note, occurredOn } = await req.json();
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum === 0) {
    return NextResponse.json({ error: "amount required (non-zero number)" }, { status: 400 });
  }

  const occurredOnDate = occurredOn ? new Date(occurredOn) : new Date();

  const transfer = await db.depositTransfer.create({
    data: {
      userId,
      depositId,
      amount: amountNum,
      note: note ? String(note).trim() : null,
      occurredOn: occurredOnDate,
    },
  });
  return NextResponse.json(transfer, { status: 201 });
}
