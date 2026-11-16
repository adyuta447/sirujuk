/** @jest-environment node */
let mockLolos = true;
const mockKeBackend = jest.fn(async (..._a: unknown[]) => new Response('{"items":[],"next":""}'));
jest.mock("../../lib/auth/guard", () => ({
  wajibPeran: async (_r: Request, izinkan: (p: string) => boolean) =>
    mockLolos && izinkan("dokter")
      ? { sesi: { sub: "u", nama: "U", role: "dokter", sid: "s".repeat(20), exp: 0 } }
      : { galat: Response.json({ code: "UNAUTHORIZED" }, { status: 401 }) },
  keBackendSebagai: (...a: unknown[]) => mockKeBackend(...a),
  json: (status: number, code: string, message: string) => Response.json({ code, message }, { status }),
}));
import { GET } from "../../app/api/v1/activity/route";

const panggil = (qs = "") => GET(new Request(`http://localhost/api/v1/activity${qs}`));
const jalur = () => (mockKeBackend.mock.calls.at(-1) as unknown as [unknown, string])[1];

beforeEach(() => { mockKeBackend.mockClear(); mockLolos = true; });

describe("GET /api/v1/activity", () => {
  it("terbuka untuk semua peran yang sudah masuk, dan menolak yang belum", async () => {
    expect((await panggil()).status).toBe(200);
    mockLolos = false;
    expect((await panggil()).status).toBe(401);
    expect(mockKeBackend).toHaveBeenCalledTimes(1);
  });
  it("meneruskan hanya parameter yang diizinkan, ter-encode", async () => {
    await panggil("?limit=25&cursor=a%7Cb&outcome=denied&resource=config&referral_id=r-1&admin=1&X-Actor=x");
    const qs = new URL(jalur(), "http://x").searchParams;
    expect([...qs.keys()].sort()).toEqual(["cursor", "limit", "outcome", "referral_id", "resource"]);
    expect(qs.get("cursor")).toBe("a|b");
  });
  it("tanpa query memanggil jalur polos, dan menolak nilai yang terlalu panjang", async () => {
    await panggil();
    expect(jalur()).toBe("/api/v1/activity");
    mockKeBackend.mockClear();
    expect((await panggil(`?cursor=${"a".repeat(300)}`)).status).toBe(400);
    expect(mockKeBackend).not.toHaveBeenCalled();
  });
});
