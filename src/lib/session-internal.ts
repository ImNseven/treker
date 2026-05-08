import { createHmac, timingSafeEqual } from "crypto";

export function sign(value: string): string {
  const secret = process.env.SESSION_SECRET!;
  const mac = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${mac}`;
}

export function verify(signed: string): string | null {
  const dot = signed.lastIndexOf(".");
  if (dot === -1) return null;
  const value = signed.slice(0, dot);
  const expected = Buffer.from(sign(value));
  const actual = Buffer.from(signed);
  if (expected.length !== actual.length) return null;
  try {
    if (!timingSafeEqual(expected, actual)) return null;
  } catch {
    return null;
  }
  return value;
}
