import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Build a DATABASE_URL with pgbouncer-friendly query params.
 * Supabase's connection pooler (port 6543) requires `pgbouncer=true` so
 * Prisma disables prepared statements — without this, every transaction
 * can crash with "prepared statement already exists" or DEALLOCATE ALL
 * conflicts that kill the Node process.
 */
function buildPooledUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    // Only enforce on the pooled port (6543); leave direct connections alone
    if (u.port === "6543" || u.searchParams.has("pgbouncer") || u.hostname.includes("pooler")) {
      if (!u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
      if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "5");
      // pgbouncer transaction-pooled connections shouldn't be left open long
      if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "20");
      return u.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : [],
    datasources: {
      db: { url: buildPooledUrl() },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
