# Data Flow

1. FKTP mengirim episode rujukan ke Go API melalui endpoint terautentikasi.
2. Go memvalidasi payload dan mengambil konteks fasilitas/dokter.
3. Go meminta ML menghasilkan sinyal `fraud_score`, `nlp_similarity`, dan `anomaly_score`.
4. Go menyimpan/menyajikan hasil keputusan dan memakai Redis hanya untuk cache dengan TTL.
5. Frontend menampilkan hasil serta antrean review; frontend tidak mengubah keputusan.
6. Kasus yellow/red ditindaklanjuti manusia. Audit outcome dapat dipakai untuk kalibrasi model setelah governance dan pelabelan disetujui.

Data diagnosis dan narasi klinis wajib dienkripsi, diminimalkan, dan tidak boleh masuk log aplikasi.
