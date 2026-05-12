import { describe, it, expect } from "vitest";
import { normalizeProjectUrl, UrlValidationError } from "@/lib/projects/url.server";

describe("normalizeProjectUrl", () => {
  it("upgrades bare hostnames to https", () => {
    const u = normalizeProjectUrl("example.com");
    expect(u.normalized).toBe("https://example.com/");
    expect(u.hostname).toBe("example.com");
  });

  it("strips query and hash, lowercases host", () => {
    const u = normalizeProjectUrl("https://Example.COM/path?x=1#y");
    expect(u.host).toBe("example.com");
    expect(u.normalized).toBe("https://example.com/path");
  });

  it.each([
    "http://localhost",
    "https://127.0.0.1",
    "http://10.0.0.5",
    "http://192.168.1.1",
    "http://172.16.0.1",
    "http://169.254.169.254",
    "http://anything.localhost",
    "http://service.internal",
  ])("rejects SSRF / invalid target %s", (input) => {
    expect(() => normalizeProjectUrl(input)).toThrow(UrlValidationError);
  });

  it("rejects empty / oversized input", () => {
    expect(() => normalizeProjectUrl("")).toThrow(/url_empty/);
    expect(() => normalizeProjectUrl("https://" + "a".repeat(3000))).toThrow();
  });
});
