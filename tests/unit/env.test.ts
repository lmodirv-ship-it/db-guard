import { describe, it, expect, beforeEach } from "vitest";
import { checkEnv } from "@/lib/env.server";

const KEYS = [
  "HN_DB_URL",
  "HN_DB_DIRECT_URL",
  "HN_JWT_SECRET",
  "RESEND_API_KEY",
  "HN_MAIL_FROM",
] as const;

beforeEach(() => {
  for (const k of KEYS) delete process.env[k];
});

describe("checkEnv", () => {
  it("reports missing keys", () => {
    const r = checkEnv();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing.sort()).toEqual([...KEYS].sort());
  });

  it("flags invalid DB URL and short JWT secret", () => {
    process.env.HN_DB_URL = "not-a-postgres-url";
    process.env.HN_DB_DIRECT_URL = "postgresql://u:p@h/d";
    process.env.HN_JWT_SECRET = "short";
    process.env.RESEND_API_KEY = "re_x";
    process.env.HN_MAIL_FROM = "x@y.z";
    const r = checkEnv();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.invalid).toContain("HN_DB_URL");
      expect(r.invalid).toContain("HN_JWT_SECRET");
    }
  });

  it("passes with all valid values", () => {
    process.env.HN_DB_URL = "postgresql://u:p@h/d";
    process.env.HN_DB_DIRECT_URL = "postgresql://u:p@h/d";
    process.env.HN_JWT_SECRET = "z".repeat(40);
    process.env.RESEND_API_KEY = "re_xxx";
    process.env.HN_MAIL_FROM = "App <a@b.io>";
    expect(checkEnv().ok).toBe(true);
  });
});
