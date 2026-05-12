import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.HN_DB_URL = "postgresql://x:y@h/d";
  process.env.HN_DB_DIRECT_URL = "postgresql://x:y@h/d";
  process.env.HN_JWT_SECRET = "a".repeat(48);
  process.env.RESEND_API_KEY = "re_test";
  process.env.HN_MAIL_FROM = "Test <noreply@example.com>";
});

describe("JWT session signing", () => {
  it("round-trips claims", async () => {
    const { signSession, verifySession } = await import("@/lib/auth/jwt.server");
    const token = await signSession({ sub: "user-1", tid: "tenant-1", email: "a@b.com" });
    const out = await verifySession(token);
    expect(out).toMatchObject({ sub: "user-1", tid: "tenant-1", email: "a@b.com" });
  });

  it("rejects a tampered token", async () => {
    const { signSession, verifySession } = await import("@/lib/auth/jwt.server");
    const token = await signSession({ sub: "u", tid: "t", email: "a@b.com" });
    const broken = token.slice(0, -2) + (token.endsWith("a") ? "b" : "a");
    await expect(verifySession(broken)).rejects.toBeTruthy();
  });

  it("rejects expired tokens", async () => {
    const { signSession, verifySession } = await import("@/lib/auth/jwt.server");
    const token = await signSession({ sub: "u", tid: "t", email: "a@b.com" }, -10);
    await expect(verifySession(token)).rejects.toBeTruthy();
  });
});
