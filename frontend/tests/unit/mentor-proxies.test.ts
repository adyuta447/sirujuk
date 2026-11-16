/** @jest-environment node */
let mockPeran = "verifikator";
const mockKeBackend = jest.fn(async (..._a: unknown[]) => new Response("{}"));
jest.mock("../../lib/auth/guard", () => {
  const { bolehSkor } = jest.requireActual("../../lib/akses");
  const sesi = () => ({ sub: "u", nama: "U", role: mockPeran, sid: "s".repeat(20), exp: 0 });
  const tolak = () => ({ galat: Response.json({ code: "FORBIDDEN" }, { status: 403 }) });
  const wajibPeran = async (_r: Request, izinkan: (p: string) => boolean) => (izinkan(mockPeran) ? { sesi: sesi() } : tolak());
  return {
    ID_AMAN: /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$/,
    wajibPeran,
    wajibPetugas: (r: Request) => wajibPeran(r, bolehSkor),
    bacaBody: async (r: Request) => r.text(),
    keBackendSebagai: (...a: unknown[]) => mockKeBackend(...a),
    json: (status: number, code: string, message: string) => Response.json({ code, message }, { status }),
  };
});
import { GET as hospitals } from "../../app/api/v1/hospitals/route";
import { GET as fit } from "../../app/api/v1/referrals/[id]/destination-fit/route";
import { GET as getConfig, PUT as putConfig } from "../../app/api/v1/config/risk/route";
import { POST as simulate } from "../../app/api/v1/simulate/route";

const PERAN = ["verifikator", "tkmkb", "dinkes", "dokter"];
const lolos = async (panggil: () => Promise<Response>) => {
  const hasil: string[] = [];
  for (const p of PERAN) {
    mockPeran = p;
    if ((await panggil()).status !== 403) hasil.push(p);
  }
  return hasil;
};
const req = (url: string, init?: RequestInit) => new Request(`http://localhost${url}`, init);
const kirim = (url: string, body: unknown) => req(url, { method: "PUT", body: JSON.stringify(body) });
const ke = () => mockKeBackend.mock.calls.at(-1) as unknown as [unknown, string, { body?: string }?];
const AKSI = { recommendation: "x", alert: true };
const KONFIG = { yellow_from: 50, red_from: 80, version: 2, actions: { green: AKSI, yellow: AKSI, red: AKSI } };

beforeEach(() => mockKeBackend.mockClear());

describe("matriks peran proxy fitur mentor", () => {
  it("GET config: petugas dan dinkes boleh, dokter tidak", async () => {
    expect(await lolos(() => getConfig(req("/api/v1/config/risk")))).toEqual(["verifikator", "tkmkb", "dinkes"]);
  });
  it("PUT config: hanya tkmkb", async () => {
    expect(await lolos(() => putConfig(kirim("/api/v1/config/risk", KONFIG)))).toEqual(["tkmkb"]);
  });
  it("hospitals: petugas dan dinkes, bukan dokter", async () => {
    expect(await lolos(() => hospitals(req("/api/v1/hospitals")))).toEqual(["verifikator", "tkmkb", "dinkes"]);
  });
  it("destination-fit dan simulate: hanya petugas", async () => {
    const params = { params: Promise.resolve({ id: "r-1" }) };
    expect(await lolos(() => fit(req("/x"), params))).toEqual(["verifikator", "tkmkb"]);
    expect(await lolos(() => simulate(req("/api/v1/simulate", { method: "POST", body: JSON.stringify({ inputs: {} }) })))).toEqual(["verifikator", "tkmkb"]);
  });
});

describe("isi yang diteruskan", () => {
  beforeEach(() => (mockPeran = "tkmkb"));

  it("PUT config membuang updated_by dan field asing, dan dry_run hanya bila persis true", async () => {
    await putConfig(kirim("/api/v1/config/risk?dry_run=true", { ...KONFIG, updated_by: "orang-lain", admin: true }));
    expect(ke()[1]).toBe("/api/v1/config/risk?dry_run=true");
    expect(Object.keys(JSON.parse(ke()[2]?.body ?? "{}")).sort()).toEqual(["actions", "red_from", "version", "yellow_from"]);
    await putConfig(kirim("/api/v1/config/risk", KONFIG));
    expect(ke()[1]).toBe("/api/v1/config/risk");
  });
  it("PUT config menolak dry_run selain persis true, supaya pratinjau tidak berubah jadi simpan", async () => {
    mockKeBackend.mockClear();
    for (const nilai of ["TRUE", "1", "false", ""]) {
      expect((await putConfig(kirim(`/api/v1/config/risk?dry_run=${nilai}`, KONFIG))).status).toBe(400);
    }
    expect(mockKeBackend).not.toHaveBeenCalled();
  });
  it("PUT config menolak bentuk salah dan versi bukan bilangan bulat", async () => {
    expect((await putConfig(kirim("/api/v1/config/risk", { ...KONFIG, version: "2" }))).status).toBe(400);
    expect((await putConfig(kirim("/api/v1/config/risk", { ...KONFIG, actions: { green: AKSI } }))).status).toBe(400);
    expect(mockKeBackend).not.toHaveBeenCalled();
  });
  it("hospitals dan destination-fit menolak parameter buruk", async () => {
    expect((await hospitals(req("/api/v1/hospitals?kind=rahasia"))).status).toBe(400);
    expect((await fit(req("/x?distance_km=abc"), { params: Promise.resolve({ id: "r-1" }) })).status).toBe(400);
    expect((await fit(req("/x"), { params: Promise.resolve({ id: "a b" }) })).status).toBe(400);
  });
  it("simulate membuang narasi klinis dan field asing, menolak tipe salah", async () => {
    mockPeran = "verifikator";
    const body = { inputs: { n90: 5, sisrute_age_days: 9, clinical_narrative: "teks bebas", admin: 1 }, destination: { distance_km: 10, facility_id: "rs-x" }, extra: 1 };
    await simulate(req("/api/v1/simulate", { method: "POST", body: JSON.stringify(body) }));
    expect(JSON.parse(ke()[2]?.body ?? "{}")).toEqual({ inputs: { n90: 5, sisrute_age_days: 9 }, destination: { distance_km: 10 } });
    const salah = await simulate(req("/api/v1/simulate", { method: "POST", body: JSON.stringify({ inputs: { n90: "5" } }) }));
    expect(salah.status).toBe(400);
  });
});
