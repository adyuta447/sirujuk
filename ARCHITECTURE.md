# Architecture

```text
Frontend (display only)
       |
       v
Go API + Decision Engine ---- Redis (cache, queue, limiter)      x1 (S12 gate), behind Cloud Run
       |  gRPC (proto/sirujuk/ml/v1), one HTTP/2 connection
       v
ML inference (gRPC, inference only)                              x0..2 behind Cloud Run's load balancer
```

Go menerima rujukan, menyiapkan fitur (batch dokter, snapshot SISRUTE), dan meminta skor serta kategori dari ML; Go tidak punya ambang sendiri. ML tidak menyimpan keputusan bisnis. Keputusan final hanya ditulis pengguna yang masuk (verifikator/TKMKB), bukan model. Frontend tidak menghitung skor, threshold, atau status audit.

Semua integrasi eksternal (P-Care, V-Claim, SISRUTE, kredensial dokter) harus melalui adapter di backend dan kontrak terverifikasi; endpoint produksi tidak diasumsikan aktif.
