import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [transactions, categories, habits, habitLogs, sleepEntries, runs, workDays] =
    await Promise.all([
      db.transaction.findMany({ where: { userId }, orderBy: { occurredOn: "desc" } }),
      db.category.findMany({ where: { userId } }),
      db.habit.findMany({ where: { userId } }),
      db.habitLog.findMany({ where: { userId } }),
      db.sleepEntry.findMany({ where: { userId }, orderBy: { startAt: "desc" } }),
      db.run.findMany({ where: { userId }, orderBy: { occurredOn: "desc" } }),
      db.workDay.findMany({ where: { userId }, orderBy: { day: "desc" } }),
    ]);

  const data = {
    exportedAt: new Date().toISOString(),
    transactions: transactions.map(t => ({ ...t, amount: t.amount.toString() })),
    categories,
    habits,
    habitLogs,
    sleepEntries,
    runs: runs.map(r => ({ ...r, distanceKm: r.distanceKm.toString() })),
    workDays: workDays.map(w => ({ ...w, hours: w.hours.toString() })),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="treker-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
