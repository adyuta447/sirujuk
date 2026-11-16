const KATEGORI = ["green", "yellow", "red"] as const;

/**
 * Isi PUT /config/risk yang boleh diteruskan: hanya batas, aksi, dan versi. Field lain (mis. updated_by) dibuang,
 * jadi klien tidak bisa memalsukan siapa pengubahnya. Null bila bentuknya salah; nilai tetap divalidasi backend.
 */
export function bersihkanKonfig(mentah: string, dryRun: boolean): string | null {
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(mentah);
  } catch {
    return null;
  }
  const { yellow_from, red_from, actions, version } = b;
  if (typeof yellow_from !== "number" || typeof red_from !== "number") return null;
  if (!dryRun && !Number.isInteger(version)) return null;
  const bersih: Record<string, { recommendation: string; alert: boolean }> = {};
  for (const k of KATEGORI) {
    const a = (actions as Record<string, Record<string, unknown>> | undefined)?.[k];
    if (typeof a?.recommendation !== "string" || typeof a?.alert !== "boolean") return null;
    bersih[k] = { recommendation: a.recommendation, alert: a.alert };
  }
  return JSON.stringify({ yellow_from, red_from, actions: bersih, ...(Number.isInteger(version) && { version }) });
}
