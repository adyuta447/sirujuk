export type HasilAuth = { tujuan: string } | { galat: string };

/** POST ke endpoint auth; hasilnya tujuan redirect atau pesan galat siap tampil. */
export async function kirimAuth(url: string, body: unknown, pesanGagal: string): Promise<HasilAuth> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { galat: data.message ?? pesanGagal };
    return { tujuan: data.tujuan ?? "/dashboard" };
  } catch {
    return { galat: "Tidak bisa terhubung ke server. Coba lagi." };
  }
}
