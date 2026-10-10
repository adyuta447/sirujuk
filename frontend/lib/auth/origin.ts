// Perlindungan CSRF: browser selalu mengirim Origin, dan Origin halaman lain tidak akan sama dengan Host kita.
// Dibandingkan ke header Host (bukan request.url) karena di balik proxy atau standalone, URL internal bisa berbeda.
export function asalSama(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
