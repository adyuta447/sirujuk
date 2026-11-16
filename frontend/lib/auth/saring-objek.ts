export type Tipe = "string" | "number" | "boolean";

/** Salin hanya kunci yang diizinkan dengan tipe yang cocok. Null bila bukan objek atau ada tipe yang salah. */
export function saringObjek(sumber: unknown, aturan: Record<string, Tipe>): Record<string, unknown> | null {
  if (typeof sumber !== "object" || sumber === null || Array.isArray(sumber)) return null;
  const hasil: Record<string, unknown> = {};
  for (const [kunci, tipe] of Object.entries(aturan)) {
    const nilai = (sumber as Record<string, unknown>)[kunci];
    if (nilai === undefined) continue;
    if (typeof nilai !== tipe) return null;
    hasil[kunci] = nilai;
  }
  return hasil;
}
