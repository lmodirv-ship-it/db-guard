import { describe, it, expect } from "vitest";
import {
  buildSessionCookie,
  buildClearSessionCookie,
  readSessionCookie,
} from "@/lib/auth/cookies.server";

describe("session cookies", () => {
  it("builds a hardened Set-Cookie", () => {
    const c = buildSessionCookie("tok123");
    expect(c).toContain("hn_session=tok123");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("Secure");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Path=/");
    expect(c).toMatch(/Max-Age=\d+/);
  });

  it("builds a clearing cookie with Max-Age=0", () => {
    expect(buildClearSessionCookie()).toContain("Max-Age=0");
  });

  it("reads the cookie value from a Request", () => {
    const req = new Request("https://x.test/", {
      headers: { cookie: "foo=bar; hn_session=abc.def.ghi; other=1" },
    });
    expect(readSessionCookie(req)).toBe("abc.def.ghi");
  });

  it("returns null when the cookie is absent", () => {
    const req = new Request("https://x.test/");
    expect(readSessionCookie(req)).toBeNull();
  });
});
