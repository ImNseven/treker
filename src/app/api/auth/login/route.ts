import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const allowed = (process.env.ALLOWED_EMAIL ?? "").toLowerCase().trim();
  if ((email ?? "").toLowerCase().trim() !== allowed) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }
  await setSession();
  return NextResponse.json({ ok: true });
}
