/** @jest-environment node */
import { NextRequest } from "next/server";
import { proxy } from "../../proxy";

describe("CSP proxy", () => {
  const csp = async () => (await proxy(new NextRequest("http://localhost/"))).headers.get("content-security-policy") ?? "";

  it("uses a per-request nonce and no unsafe-inline for scripts", async () => {
    const a = await csp();
    const b = await csp();
    expect(a).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(a).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(a).not.toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(a).not.toBe(b);
  });

  it("blocks objects, framing and foreign form targets", async () => {
    const a = await csp();
    expect(a).toContain("object-src 'none'");
    expect(a).toContain("frame-ancestors 'none'");
    expect(a).toContain("form-action 'self'");
  });
});
