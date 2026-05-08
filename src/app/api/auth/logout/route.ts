import { clearSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
