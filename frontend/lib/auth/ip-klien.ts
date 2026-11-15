// IP klien hanya bila platform yang mengisinya. Vercel menulis ulang X-Forwarded-For dari koneksi TCP dan membuang
// nilai kiriman klien, jadi entri paling kiri adalah IP klien asli (x-real-ip tidak dijamin begitu). Di tempat lain
// (compose, server sendiri) header itu milik klien, maka "" = tidak diketahui, dan pembatas login kembali per email.
// shortcut: bila Vercel dipasang di belakang proxy lain (mis. Cloudflare), entri ini menjadi IP proxy dan semua
// pengguna berbagi satu IP; pakai Verified Proxy Vercel atau hapus VERCEL dari kondisi ini sebelum memasangnya.
export function ipKlien(request: Request, env: Record<string, string | undefined> = process.env): string {
  if (env.VERCEL !== "1") return "";
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim().slice(0, 45) ?? "";
}
