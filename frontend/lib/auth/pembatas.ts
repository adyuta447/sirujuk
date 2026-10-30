interface OpsiPembatas {
  batas: number;
  jendelaMs: number;
  maksKunci?: number;
}

// shortcut: pembatas percobaan di memori satu instance; pindahkan ke Redis bila server lebih dari satu.
export function buatPembatas({ batas, jendelaMs, maksKunci = 5000 }: OpsiPembatas) {
  const percobaan = new Map<string, { n: number; reset: number }>();

  return {
    tertahan(kunci: string): boolean {
      const p = percobaan.get(kunci);
      if (!p || p.reset < Date.now()) return false;
      return p.n >= batas;
    },
    sisaDetik(kunci: string): number {
      const p = percobaan.get(kunci);
      if (!p) return 0;
      return Math.max(1, Math.ceil((p.reset - Date.now()) / 1000));
    },
    catatGagal(kunci: string): void {
      const p = percobaan.get(kunci);
      if (!p || p.reset < Date.now()) percobaan.set(kunci, { n: 1, reset: Date.now() + jendelaMs });
      else p.n += 1;
      if (percobaan.size > maksKunci) percobaan.clear();
    },
    bersihkan(kunci: string): void {
      percobaan.delete(kunci);
    },
  };
}
