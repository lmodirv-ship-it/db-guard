import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password.server";

describe("password hashing (PBKDF2-SHA256)", () => {
  it("verifies the same password it hashed", async () => {
    const h = await hashPassword("CorrectHorse!42");
    expect(h.startsWith("pbkdf2$600000$")).toBe(true);
    expect(await verifyPassword("CorrectHorse!42", h)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const h = await hashPassword("CorrectHorse!42");
    expect(await verifyPassword("wrong", h)).toBe(false);
  });

  it("produces a different hash each time (random salt)", async () => {
    const a = await hashPassword("same-password-1234");
    const b = await hashPassword("same-password-1234");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-password-1234", a)).toBe(true);
    expect(await verifyPassword("same-password-1234", b)).toBe(true);
  });

  it("rejects passwords shorter than 8 chars", async () => {
    await expect(hashPassword("short")).rejects.toThrow("password_too_short");
  });

  it("rejects malformed encoded hashes", async () => {
    expect(await verifyPassword("any", "not-a-valid-hash")).toBe(false);
    expect(await verifyPassword("any", "pbkdf2$0$x$y")).toBe(false);
  });
});
