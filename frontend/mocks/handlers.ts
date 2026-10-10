import { rest } from "msw";

// Respons kosong cukup untuk tes komponen; tidak ada data pasien contoh di aplikasi.
export const handlers = [
  rest.get("*/api/v1/referrals", (_request, response, context) => response(context.json([]))),
];
