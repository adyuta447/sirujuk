/** @jest-environment node */
import { bacaBody, keBackendSebagai, wajibTingkat } from "../../lib/auth/guard";
import { cookieAman, demoAktif } from "../../lib/auth/session";

const sesi = (role: "verifikator" | "tkmkb") => ({ sub: "a@b.id", nama: "A", role, exp: 9999999999 });
const backend = (status: number, body: unknown) =>
  jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe("demoAktif", () => {
  const awal = { ...process.env };
  afterEach(() => { process.env = { ...awal }; });
  const set = (env: Record<string, string | undefined>) => {
    for (const k of ["DEMO_MODE", "VERCEL_ENV", "APP_ENV"]) delete process.env[k];
    Object.assign(process.env, env);
  };
  it("is off by default and off when APP_ENV=production", () => {
    set({});
    expect(demoAktif()).toBe(false);
    set({ DEMO_MODE: "true", APP_ENV: "production" });
    expect(demoAktif()).toBe(false);
  });
  it("is on with DEMO_MODE=true, also on Vercel Production (hackathon demo)", () => {
    set({ DEMO_MODE: "true", VERCEL_ENV: "preview" });
    expect(demoAktif()).toBe(true);
    set({ DEMO_MODE: "true", VERCEL_ENV: "production" });
    expect(demoAktif()).toBe(true);
    set({ DEMO_MODE: "yes" });
    expect(demoAktif()).toBe(false);
  });
});

describe("wajibTingkat (red referrals are TKMKB only)", () => {
  it("blocks a verifikator on a red referral and lets yellow through", async () => {
    backend(200, { decision: { decision: "red" } });
    expect((await wajibTingkat(sesi("verifikator"), "r-1"))?.status).toBe(403);
    backend(200, { decision: { decision: "yellow" } });
    expect(await wajibTingkat(sesi("verifikator"), "r-1")).toBeNull();
  });
  it("lets TKMKB through without asking the backend", async () => {
    const f = backend(200, {});
    expect(await wajibTingkat(sesi("tkmkb"), "r-1")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
  it("fails closed when the referral cannot be read or is malformed", async () => {
    backend(404, { code: "NOT_FOUND" });
    expect((await wajibTingkat(sesi("verifikator"), "r-1"))?.status).toBe(404);
    backend(200, { unexpected: true });
    expect((await wajibTingkat(sesi("verifikator"), "r-1"))?.status).toBe(502);
  });
});

describe("backend calls and body limits", () => {
  it("forwards the signed-in user as the actor", async () => {
    const f = backend(200, {});
    await keBackendSebagai(sesi("tkmkb"), "/api/v1/stats");
    const h = (f.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(h["X-Actor"]).toBe("a@b.id");
    expect(h["X-Actor-Role"]).toBe("tkmkb");
  });
  it("rejects an oversized body from Content-Length before reading it", async () => {
    const req = new Request("http://x/", { method: "POST", body: "a".repeat(100), headers: { "content-length": "100" } });
    const text = jest.spyOn(req, "text");
    expect(await bacaBody(req, 50)).toBeNull();
    expect(text).not.toHaveBeenCalled();
  });
});

describe("cookieAman", () => {
  const produksi = { NODE_ENV: "production" };

  it("is strict in production by default", () => {
    expect(cookieAman(produksi)).toBe(true);
  });

  it("relaxes only for a local production build that opts in", () => {
    expect(cookieAman({ ...produksi, ALLOW_INSECURE_COOKIE: "true" })).toBe(false);
  });

  it("ignores the opt-in on Vercel Production", () => {
    expect(cookieAman({ ...produksi, ALLOW_INSECURE_COOKIE: "true", VERCEL_ENV: "production" })).toBe(true);
  });

  it("ignores the opt-in when APP_ENV is production", () => {
    expect(cookieAman({ ...produksi, ALLOW_INSECURE_COOKIE: "true", APP_ENV: "production" })).toBe(true);
  });

  it("only the exact value true opts in", () => {
    for (const v of ["1", "yes", "TRUE", "", "false"]) {
      expect(cookieAman({ ...produksi, ALLOW_INSECURE_COOKIE: v })).toBe(true);
    }
  });

  it("uses plain cookies outside production builds", () => {
    expect(cookieAman({ NODE_ENV: "development" })).toBe(false);
  });
});
