import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { inlineHashes, policyFor, stamp } from "../../../scripts/stamp-csp.mjs";

const sha = (body: string) =>
  `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`;

const page = (head = "", body = "") =>
  `<!DOCTYPE html><html><head>${head}</head><body>${body}</body></html>`;

describe("stamp-csp", () => {
  it("hashes inline scripts so they run without 'unsafe-inline'", () => {
    const inline = 'self.__next_f.push([1,"hydration"])';
    const policy = policyFor(page("", `<script>${inline}</script>`));
    expect(policy).toContain(sha(inline));
    expect(policy).toMatch(/script-src [^;]*/);
    expect(policy.match(/script-src [^;]*/)![0]).not.toContain("'unsafe-inline'");
  });

  it("ignores external scripts and JSON-LD, which need no hash", () => {
    const html = page(
      '<script src="/_next/x.js"></script>' +
        '<script type="application/ld+json">{"@type":"WebSite"}</script>',
    );
    expect(inlineHashes(html)).toEqual([]);
  });

  it("does not confuse an element whose attributes merely contain 'src'", () => {
    const inline = "console.log('srcset')";
    expect(inlineHashes(page("", `<script data-srcset="x">${inline}</script>`)))
      .toEqual([sha(inline)]);
  });

  it("keeps the policy locked down", () => {
    const policy = policyFor(page());
    for (const directive of [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-src 'none'",
      "upgrade-insecure-requests",
    ]) {
      expect(policy).toContain(directive);
    }
    // A wildcard source would quietly undo the whole policy.
    expect(policy).not.toMatch(/(^|[ ;])\*/);
  });

  it("allows exactly the cross-origin endpoints the product needs", () => {
    const policy = policyFor(page());
    // The vending API backs meter checks, orders and payment status.
    expect(policy).toContain("https://voltzw-vend.appwrite.network");
    // Consent-gated analytics.
    expect(policy).toContain("https://www.googletagmanager.com");
  });

  it("is idempotent: re-stamping does not stack policies", () => {
    const once = stamp(page("<title>t</title>", "<script>a()</script>"))!;
    const twice = stamp(once)!;
    expect(twice.match(/http-equiv="Content-Security-Policy"/g)).toHaveLength(1);
    expect(twice).toBe(once);
  });

  it("re-stamping after an edit reflects the new inline script", () => {
    const first = stamp(page("", "<script>a()</script>"))!;
    const edited = first.replace("<script>a()</script>", "<script>b()</script>");
    const second = stamp(edited)!;
    expect(second).toContain(sha("b()"));
    expect(second).not.toContain(sha("a()"));
  });

  it("returns null for markup with no <head> rather than corrupting it", () => {
    expect(stamp("<p>fragment</p>")).toBeNull();
  });
});
