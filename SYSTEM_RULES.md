# System Rules

Aturan normatif berada di `system-rules/`. Ringkasannya:

1. Go adalah decision owner.
2. ML hanya inference dan mengembalikan sinyal numerik.
3. Redis hanya cache, bukan source of truth.
4. Next.js hanya display/orchestration UI; tidak ada cross-domain business logic.
5. Skor bukan bukti hukum; red selalu memerlukan audit medis manusia.
