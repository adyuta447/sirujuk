# Architecture

```text
Frontend (display only)
       |
       v
Go API + Decision Engine ---- Redis (cache only)
       |
       v
ML FastAPI (inference only)
```

Go menerima rujukan, mengambil data referensi/repository, meminta sinyal dari ML, menghitung skor final, dan menerapkan threshold. ML tidak menyimpan keputusan bisnis. Frontend tidak menghitung skor, threshold, atau status audit.

Semua integrasi eksternal (P-Care, V-Claim, SISRUTE, kredensial dokter) harus melalui adapter di backend dan kontrak terverifikasi; endpoint produksi tidak diasumsikan aktif.
