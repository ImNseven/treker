import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.SESSION_SECRET = "a".repeat(64);
});

describe("session sign/verify", async () => {
  const { sign, verify } = await import("../session-internal");

  it("round-trips correctly", () => {
    const signed = sign("owner");
    expect(verify(signed)).toBe("owner");
  });

  it("rejects tampered value", () => {
    const signed = sign("owner");
    const tampered = signed.slice(0, -2) + "xx";
    expect(verify(tampered)).toBeNull();
  });

  it("rejects missing dot", () => {
    expect(verify("nodothere")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(verify("")).toBeNull();
  });
});
