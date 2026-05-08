import { cookies } from "next/headers";
import { sign, verify } from "./session-internal";

const COOKIE = "treker_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function setSession() {
  const jar = await cookies();
  jar.set(COOKIE, sign("owner"), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  return verify(raw);
}
