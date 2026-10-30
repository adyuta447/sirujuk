/** Email dan sandi dari body JSON (dipotong ke batas panjang), atau null bila bukan JSON valid. */
export function bacaLogin(mentah: string): { email: string; sandi: string } | null {
  try {
    const b = JSON.parse(mentah);
    return {
      email: typeof b.email === "string" ? b.email.trim().slice(0, 254) : "",
      sandi: typeof b.sandi === "string" ? b.sandi.slice(0, 200) : "",
    };
  } catch {
    return null;
  }
}
