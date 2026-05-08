import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/lib/seed";

export const runtime = "nodejs";

export async function GET() {
  await seedIfEmpty();
  return NextResponse.json({ ok: true });
}
