import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// DELETE /api/deposits/:id/transfers/:transferId
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; transferId: string }> }
) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: depositId, transferId } = await ctx.params;
  const transfer = await db.depositTransfer.findFirst({
    where: { id: transferId, depositId, userId },
    select: { id: true },
  });
  if (!transfer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.depositTransfer.delete({ where: { id: transferId } });
  return NextResponse.json({ ok: true });
}
