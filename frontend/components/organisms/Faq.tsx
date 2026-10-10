"use client";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

const TANYA: [string, string][] = [
  ["Apakah skor tinggi berarti dokter berbuat curang?", "Tidak. Skor 0–100 hanya menentukan urutan antrean: hijau lolos, kuning ditinjau, merah diaudit lebih dulu. Skor merah pun belum tentu salah. Dokter lebih dulu diminta klarifikasi, dan tidak ada sanksi yang keluar dari sistem."],
  ["Siapa yang memutuskan rujukan ditahan?", "Selalu manusia: verifikator BPJS untuk antrean harian, TKMKB untuk kasus merah. Sistem hanya mengusulkan prioritas, lalu mencatat setiap keputusan beserta alasannya sehingga bisa diaudit balik."],
  ["Bagaimana dengan daerah yang rumah sakitnya terbatas?", "Konteks itu ikut dihitung. Konsentrasi RS tujuan dibaca bersama ketersediaan alat dan SDM di faskes asal. Kalau memang tidak ada pilihan lain, sistem menurunkan bobot sinyalnya. Ambang kuning dan merah pun dikalibrasi dari sebaran skor nyata, bukan angka mati, dan dokter bisa menjelaskan lewat klarifikasi."],
  ["Apakah data pasien terlihat?", "Ya, tetapi hanya untuk petugas berwenang yang sudah login: verifikator, TKMKB, dan dokter yang diminta klarifikasi. Dinas Kesehatan hanya melihat angka agregat per wilayah tanpa identitas pasien. Sistem mencatat setiap keputusan dan klarifikasi."],
  ["Dari mana skor berasal?", "Empat indikator yang masing-masing menunjukkan nilai dan kesegaran datanya: porsi rujukan keluhan ringan, konsentrasi RS tujuan, ketersediaan alat/SDM di faskes asal, dan kewajaran narasi klinis. Kalau data pendukungnya basi, bobotnya otomatis turun, jadi ini bukan angka kotak hitam."],
  ["Apa yang belum bisa dideteksi?", "Keluhan yang dipalsukan pasien, kolusi dokter dengan pasien, dan rujukan yang dokumennya rapi tapi indikasi medisnya lemah, yaitu pola yang hanya terlihat lewat pemeriksaan fisik atau kunjungan lapangan. Itu sebabnya skor tidak pernah menjadi vonis."],
];

const TEAL = "#0E7C6B";

// Akordeon satu-buka: animasi grid-rows 300ms, masuk staggered saat scroll,
// semuanya dimatikan otomatis bila pengguna memilih reduced motion.
export const Faq = () => {
  const [buka, setBuka] = useState<number | null>(0);
  const [tampil, setTampil] = useState(false);
  const [rapi, setRapi] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTampil(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Stagger hanya untuk animasi masuk; setelah selesai, delay dicabut supaya
  // buka-tutup akordeon selalu responsif.
  useEffect(() => {
    if (!tampil) return;
    const t = window.setTimeout(() => setRapi(true), 700);
    return () => window.clearTimeout(t);
  }, [tampil]);

  return (
    <section id="tanya-jawab" className="bg-[#F4F6F9] scroll-mt-20">
      <div ref={ref} className="max-w-[56rem] mx-auto px-5 md:px-10 py-20">
        <h2 className="mt-2 text-4xl md:text-6xl font-extrabold tracking-tighter leading-[1.05]">
          Tanya jawab.
        </h2>
        <p className="mt-4 text-lg text-[#56657A] max-w-2xl">
          Jawaban singkat atas hal yang paling sering ditanyakan dokter, verifikator, dan dinas kesehatan.
        </p>
        <div className="mt-10 space-y-3">
          {TANYA.map(([q, a], i) => {
            const terbuka = buka === i;
            return (
              <div
                key={q}
                className="bg-white rounded-4xl border transition-all duration-300 motion-safe:data-[tampil=false]:opacity-0 motion-safe:data-[tampil=false]:translate-y-4"
                data-tampil={tampil}
                style={{
                  borderColor: terbuka ? "#1E3A5F" : "#DCE3EC",
                  transitionDelay: rapi ? undefined : `${i * 60}ms`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setBuka(terbuka ? null : i)}
                  aria-expanded={terbuka}
                  aria-controls={`faq-isi-${i}`}
                  className="w-full min-h-14 flex items-center gap-4 cursor-pointer text-left px-6 py-4 rounded-4xl focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1E3A5F]"
                >
                  <span
                    aria-hidden="true"
                    className="font-mono text-sm font-extrabold shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center transition-colors duration-300"
                    style={{
                      backgroundColor: terbuka ? "#1E3A5F" : "#E7ECF3",
                      color: terbuka ? "#FFFFFF" : TEAL,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 font-bold text-lg leading-snug">{q}</span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: terbuka ? TEAL : "#F4F6F9",
                      color: terbuka ? "#FFFFFF" : "#1E3A5F",
                      transform: terbuka ? "rotate(45deg)" : "none",
                    }}
                  >
                    <Plus size={18} />
                  </span>
                </button>
                <div
                  id={`faq-isi-${i}`}
                  role="region"
                  className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
                  style={{ gridTemplateRows: terbuka ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="text-[#56657A] leading-relaxed px-6 pb-5 pl-[4.75rem]">
                      {a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
