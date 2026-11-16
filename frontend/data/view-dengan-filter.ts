import type { View } from "../lib/sirujuk-data";

// Halaman yang benar-benar memakai kolom cari dan pilihan wilayah di bilah atas. Di halaman lain keduanya tidak
// berefek, jadi disembunyikan agar tidak tampak berfungsi.
export const VIEW_DENGAN_FILTER: View[] = ["masuk", "queue", "rumahsakit"];
