/** @jest-environment node */
const keBackendSebagai = jest.fn(async () => new Response("[]"));
jest.mock("../../lib/auth/guard", () => ({
  wajibPeran: async () => ({ sesi: { sub: "a", nama: "A", role: "verifikator", sid: "s".repeat(20), exp: 0 } }),
  keBackendSebagai: (...a: unknown[]) => keBackendSebagai(...(a as [])),
  json: (status: number, code: string, message: string) => Response.json({ code, message }, { status }),
}));
import { GET } from "../../app/api/v1/referrals/route";

const panggil = (qs: string) => GET(new Request(`http://localhost/api/v1/referrals${qs}`));
const jalurKeBackend = () => (keBackendSebagai.mock.calls.at(-1) as unknown as [unknown, string])[1];

describe("GET /api/v1/referrals", () => {
  beforeEach(() => keBackendSebagai.mockClear());

  it("meneruskan hanya parameter yang diizinkan, ter-encode", async () => {
    await panggil("?limit=10&cursor=a%2Bb%3D&risk=red&wilayah=Jakarta%20Utara&q=x&admin=1&doctor_id=d-001");
    const qs = new URL(jalurKeBackend(), "http://x").searchParams;
    expect([...qs.keys()].sort()).toEqual(["cursor", "limit", "q", "risk", "wilayah"]);
    expect(qs.get("cursor")).toBe("a+b=");
  });

  it("tanpa query tetap memanggil jalur lama (array polos)", async () => {
    await panggil("");
    expect(jalurKeBackend()).toBe("/api/v1/referrals");
  });

  it("menolak nilai yang terlalu panjang", async () => {
    const res = await panggil(`?cursor=${"a".repeat(600)}`);
    expect(res.status).toBe(400);
    expect(keBackendSebagai).not.toHaveBeenCalled();
  });
});
