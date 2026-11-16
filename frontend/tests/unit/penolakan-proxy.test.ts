/** @jest-environment node */
// Guard, cookie dan Origin asli; hanya sesi (tanda tangan) dan fetch ke backend yang dipalsukan.
let mockSesi: { sub: string; nama: string; role: string; sid: string; exp: number } | null = null;
let mockLaporGagal = false;
jest.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "x" }) }) }));
jest.mock("../../lib/auth/session", () => ({ COOKIE: "c", sesiDariCookie: async () => mockSesi }));
jest.mock("next/server", () => ({ after: (f: () => unknown) => void f() }));

import { GET as aktivitas } from "../../app/api/v1/activity/route";
import { POST as audit } from "../../app/api/v1/audits/route";
import { GET as getConfig, PUT as putConfig } from "../../app/api/v1/config/risk/route";
import { GET as hospitals } from "../../app/api/v1/hospitals/route";
import { POST as klarifikasi } from "../../app/api/v1/referrals/[id]/clarifications/route";
import { GET as fit } from "../../app/api/v1/referrals/[id]/destination-fit/route";
import { POST as rescore } from "../../app/api/v1/referrals/[id]/rescore/route";
import { DELETE as arsip, GET as bacaRujukan, PUT as ubah } from "../../app/api/v1/referrals/[id]/route";
import { GET as daftar } from "../../app/api/v1/referrals/route";
import { POST as skor } from "../../app/api/v1/referrals/score/route";
import { POST as simulasi } from "../../app/api/v1/simulate/route";
import { GET as stats } from "../../app/api/v1/stats/route";

const panggilan: { url: string; init?: RequestInit }[] = [];
const laporan = () => panggilan.filter((p) => p.url.endsWith("/api/v1/activity/refusal"));
const isi = (p: { init?: RequestInit }) => JSON.parse(String(p.init?.body));
const sesi = (role: string) => (mockSesi = { sub: `${role}@demo.sirujuk.id`, nama: "N", role, sid: "s".repeat(20), exp: 0 });

beforeEach(() => {
  panggilan.length = 0;
  mockSesi = null;
  mockLaporGagal = false;
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    panggilan.push({ url: String(url), init });
    if (String(url).endsWith("/activity/refusal")) {
      if (mockLaporGagal) throw new Error("backend mati");
      return new Response(null, { status: 204 });
    }
    if (/referrals\/r-merah$/.test(String(url))) return Response.json({ decision: { decision: "red" } });
    if (/referrals\/r-kuning$/.test(String(url))) return Response.json({ decision: { decision: "yellow" } });
    return Response.json({ ok: true });
  }) as unknown as typeof fetch;
});

const req = (path: string, method = "GET", body?: unknown, h: Record<string, string> = {}) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { origin: "http://localhost", host: "localhost", "content-type": "application/json", ...h },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
const P = { params: Promise.resolve({ id: "r-1" }) };
const AUDIT = { referral_id: "r-merah", outcome: "valid", note: "ok" };

// [rute, peran yang ditolak, pemanggilan, resource, action, resource_id]. Selalu enam elemen: jika kurang, Jest memberi
// parameter terakhir sebagai callback `done` dan tesnya menunggu selamanya.
const TABEL: [string, string, () => Promise<Response>, string, string, string][] = [
  ["GET /referrals", "dinkes", () => daftar(req("/api/v1/referrals")), "referral", "list", ""],
  ["GET /referrals/{id}", "dinkes", () => bacaRujukan(req("/x"), P), "referral", "read", "r-1"],
  ["PUT /referrals/{id}", "dokter", () => ubah(req("/x", "PUT", {}), P), "referral", "update", "r-1"],
  ["DELETE /referrals/{id}", "verifikator", () => arsip(req("/x", "DELETE", {}), P), "referral", "delete", "r-1"],
  ["POST rescore", "dokter", () => rescore(req("/x", "POST"), P), "referral", "rescore", "r-1"],
  ["POST clarifications", "dinkes", () => klarifikasi(req("/x", "POST", {}), P), "clarification", "create", "r-1"],
  ["GET destination-fit", "dokter", () => fit(req("/x"), P), "referral", "read", "r-1"],
  ["POST /audits", "dokter", () => audit(req("/api/v1/audits", "POST", AUDIT)), "audit", "create", ""],
  ["POST /simulate", "dokter", () => simulasi(req("/api/v1/simulate", "POST", { inputs: {} })), "simulation", "simulate", ""],
  ["GET /config/risk", "dokter", () => getConfig(req("/api/v1/config/risk")), "config", "read", ""],
  ["PUT /config/risk", "verifikator", () => putConfig(req("/api/v1/config/risk", "PUT", {})), "config", "update", ""],
  ["POST /referrals/score", "dokter", () => skor(req("/api/v1/referrals/score", "POST", {}, { "idempotency-key": "k-1" })), "referral", "create", ""],
];

describe("setiap penolakan peran oleh proxy dilaporkan tepat satu kali", () => {
  it.each(TABEL)("%s oleh %s", async (_n, peran, panggil, resource, action, resourceId) => {
    sesi(peran);
    const res = await panggil();
    expect(res.status).toBe(403);
    expect(laporan()).toHaveLength(1);
    expect(isi(laporan()[0])).toEqual({ resource, action, status: 403, code: "FORBIDDEN", ...(resourceId ? { resource_id: resourceId } : {}) });
    expect(panggilan).toHaveLength(1); // hanya laporan; permintaan aslinya tidak pernah ke backend
  });
});

describe("kontrak laporan", () => {
  it("aktor hanya dari header sesi, tidak pernah dari body; bentuknya sesuai aturan backend", async () => {
    sesi("verifikator");
    await putConfig(req("/api/v1/config/risk", "PUT", {}));
    const l = laporan()[0];
    const h = l.init?.headers as Record<string, string>;
    expect([h["X-Actor"], h["X-Actor-Role"], h["X-Session"]]).toEqual(["verifikator@demo.sirujuk.id", "verifikator", "s".repeat(20)]);
    expect(Object.keys(isi(l))).not.toEqual(expect.arrayContaining(["actor", "role", "detail"]));
    expect(l.init?.method).toBe("POST");
    expect(l.init?.signal).toBeInstanceOf(AbortSignal); // timeout pendek
    const b = isi(l);
    expect(b.status).toBeGreaterThanOrEqual(400);
    expect(b.status).toBeLessThanOrEqual(499);
    expect(b.code).toMatch(/^[A-Z_]{1,40}$/);
  });
  it("tingkat: verifikator pada rujukan merah dilaporkan FORBIDDEN_LEVEL dengan nomor rujukannya", async () => {
    sesi("verifikator");
    const res = await audit(req("/api/v1/audits", "POST", AUDIT));
    expect(res.status).toBe(403);
    expect(laporan()).toHaveLength(1);
    expect(isi(laporan()[0])).toEqual({ resource: "audit", action: "create", status: 403, code: "FORBIDDEN_LEVEL", resource_id: "r-merah" });
  });
  it("origin asing, isi salah bentuk, dan nomor rujukan tak sah dilaporkan sebagai ditolak", async () => {
    sesi("tkmkb");
    expect((await putConfig(req("/api/v1/config/risk", "PUT", {}, { origin: "http://jahat.test" }))).status).toBe(403);
    expect(isi(laporan()[0])).toMatchObject({ resource: "config", action: "update", status: 403, code: "FORBIDDEN" });
    expect((await audit(req("/api/v1/audits", "POST", "bukan json"))).status).toBe(400);
    expect(isi(laporan()[1])).toMatchObject({ resource: "audit", status: 400, code: "INVALID_REQUEST" });
    expect((await rescore(req("/x", "POST"), { params: Promise.resolve({ id: "a b" }) })).status).toBe(400);
    expect(isi(laporan()[2])).not.toHaveProperty("resource_id"); // id tak lolos aturan backend: tidak dikirim
    expect(laporan()).toHaveLength(3);
  });
  it("score tanpa Idempotency-Key dan terlalu besar dilaporkan", async () => {
    sesi("tkmkb");
    expect((await skor(req("/api/v1/referrals/score", "POST", {}))).status).toBe(400);
    expect((await skor(req("/api/v1/referrals/score", "POST", {}, { "idempotency-key": "k-1", "content-length": "99999999" }))).status).toBe(413);
    expect(laporan().map((l) => isi(l).code)).toEqual(["INVALID_REQUEST", "PAYLOAD_TOO_LARGE"]);
  });
});

describe("yang tidak dilaporkan", () => {
  it("tanpa sesi sah (401) tidak ada satu pun panggilan ke backend", async () => {
    expect((await putConfig(req("/api/v1/config/risk", "PUT", {}))).status).toBe(401);
    expect((await daftar(req("/api/v1/referrals"))).status).toBe(401);
    expect(panggilan).toHaveLength(0);
  });
  it("permintaan yang diizinkan diteruskan tanpa laporan, termasuk perlu-klarifikasi di rujukan merah", async () => {
    sesi("verifikator");
    await audit(req("/api/v1/audits", "POST", { ...AUDIT, referral_id: "r-kuning" }));
    await audit(req("/api/v1/audits", "POST", { ...AUDIT, outcome: "perlu-klarifikasi" }));
    expect(laporan()).toHaveLength(0);
    expect(panggilan.filter((p) => p.url.endsWith("/api/v1/audits"))).toHaveLength(2);
  });
  it("rute yang memang tidak dicatat backend (daftar RS, statistik, log aktivitas) tidak melapor", async () => {
    sesi("dokter");
    expect((await hospitals(req("/api/v1/hospitals"))).status).toBe(403);
    expect((await stats(req("/api/v1/stats"))).status).toBe(403);
    expect((await aktivitas(req("/api/v1/activity?cursor=" + "a".repeat(300)))).status).toBe(400);
    expect(laporan()).toHaveLength(0);
  });
});

describe("kegagalan melapor", () => {
  it("tidak mengubah jawaban 403 ke pengguna", async () => {
    sesi("verifikator");
    const normal = await putConfig(req("/api/v1/config/risk", "PUT", {}));
    const bodiNormal = await normal.text();
    mockLaporGagal = true;
    const gagal = await putConfig(req("/api/v1/config/risk", "PUT", {}));
    expect(gagal.status).toBe(403);
    expect(await gagal.text()).toBe(bodiNormal);
  });
});
