// Pembatas percobaan login di memori satu instance.
// shortcut: per instance, jadi bukan pertahanan utama; backend punya pembatas yang dibagi lewat Redis.
// Saat penuh, yang dibuang entri kedaluwarsa, lalu yang belum terkunci, lalu yang paling lama; tidak pernah semuanya.
// Jadi penyerang dengan ribuan email berbeda tidak bisa mereset akun yang sudah terkunci.
export function buatPembatas(batas: number, jendelaMs: number, maksKunci: number) {
  const hitung = new Map<string, { n: number; reset: number }>();

  const buang = () => {
    const sekarang = Date.now();
    for (const [k, v] of hitung) if (v.reset < sekarang) hitung.delete(k);
    // Yang sudah terkunci dipertahankan; yang baru gagal sekali dibuang dulu, paling lama lebih dulu.
    for (const [k, v] of hitung) {
      if (hitung.size < maksKunci) break;
      if (v.n < batas) hitung.delete(k);
    }
    while (hitung.size >= maksKunci) {
      const tertua = hitung.keys().next().value;
      if (tertua === undefined) break;
      hitung.delete(tertua);
    }
  };

  return {
    tertahan(kunci: string): boolean {
      const p = hitung.get(kunci);
      return !!p && p.reset >= Date.now() && p.n >= batas;
    },
    catatGagal(kunci: string) {
      const p = hitung.get(kunci);
      if (p && p.reset >= Date.now()) {
        p.n += 1;
        return;
      }
      if (!p && hitung.size >= maksKunci) buang();
      hitung.set(kunci, { n: 1, reset: Date.now() + jendelaMs });
    },
    /** Detik sampai kunci boleh mencoba lagi (untuk header Retry-After). */
    sisaDetik(kunci: string): number {
      const p = hitung.get(kunci);
      return p ? Math.max(1, Math.ceil((p.reset - Date.now()) / 1000)) : 0;
    },
    hapus(kunci: string) {
      hitung.delete(kunci);
    },
  };
}

/**
 * Kunci percobaan login. Di Vercel, header x-vercel-forwarded-for diisi platform dan tidak bisa dipalsukan klien,
 * jadi kuncinya email + IP: orang lain tidak bisa mengunci akunmu dari alamat berbeda.
 * Header itu hanya dipercaya saat berjalan di Vercel (env VERCEL): di tempat lain (compose, lokal) klien bisa
 * mengisinya sendiri dan tiap nilai baru akan memberi kunci baru, jadi batas percobaan bisa dilewati.
 * Header x-forwarded-for sengaja tidak dipakai karena klien bisa mengisinya sendiri. Tanpa header tepercaya
 * kuncinya email saja, dan batas yang berlaku lintas instance ada di backend.
 */
export function kunciPercobaan(email: string, headers: Headers, env: Record<string, string | undefined> = process.env): string {
  const ip = env.VERCEL ? headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() : undefined;
  const e = email.toLowerCase();
  return ip ? `${ip}|${e}` : e;
}
