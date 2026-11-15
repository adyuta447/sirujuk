/** @jest-environment node */
import { POST } from "../../app/api/auth/login/route";

// Penguncian login lewat route sungguhan (QA 30 Okt, cyber security P1): 5 sandi salah untuk satu email, percobaan ke-6
// ditolak 429 tanpa menyentuh backend; email lain tidak ikut terkunci.
const masuk = (email: string) =>
  POST(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { origin: "http://localhost", host: "localhost", "content-type": "application/json" },
      body: JSON.stringify({ email, sandi: "sandi-salah-123" }),
    }),
  );

describe("login lockout", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "x".repeat(32);
  });
  afterEach(() => jest.restoreAllMocks());

  it("locks an email after 5 wrong passwords without asking the backend again", async () => {
    const backend = jest.spyOn(global, "fetch").mockImplementation(async () => new Response("{}", { status: 401 }));
    for (let i = 1; i <= 5; i++) expect((await masuk("korban@uji.id")).status).toBe(401);
    const terkunci = await masuk("KORBAN@uji.id ");
    expect(terkunci.status).toBe(429);
    expect(Number(terkunci.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(backend).toHaveBeenCalledTimes(5);
    expect((await masuk("lain@uji.id")).status).toBe(401);
  });

  it("passes the backend's own lock (10 per email across instances) through as 429", async () => {
    jest.spyOn(global, "fetch").mockImplementation(async () => new Response("{}", { status: 429 }));
    expect((await masuk("diserang@uji.id")).status).toBe(429);
  });
});
