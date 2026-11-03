# Penerimaan autentikasi warga — tahap pertama

## Verifikasi otomatis

- `npm run build`: pemeriksaan TypeScript dan build produksi.
- `npm test`: migrasi asli, trigger profil, pemaksaan role/status registrasi, batasan identitas, RLS kepemilikan, privilege, akun nonaktif, dan sesi dicabut di PGlite.
- `npm run test:e2e`: browser Chrome dengan respons Auth/REST tiruan; login, register, konfirmasi PKCE, refresh, logout, akses langsung, penyimpanan sesi, validasi, kegagalan, keyboard, dan layout responsif.

Pengujian tiruan tidak membuktikan konfigurasi project Supabase cloud, email, atau hosting. Skenario di bawah belum dijalankan pada project nyata.

## Checklist setelah Supabase dikonfigurasi

Gunakan dua identitas dummy berbeda. Contoh akun lokal: `warga.satu@example.test` dengan NIK `0000000000000001`, dan `warga.dua@example.test` dengan NIK `0000000000000002`. Gunakan alamat serta nomor HP fiktif.

| Skenario | Hasil yang diharapkan |
| --- | --- |
| Daftar dengan data lengkap | Auth user dan satu profil terbentuk; role `warga`, status `menunggu_verifikasi`. |
| Konfirmasi email aktif | Sebelum konfirmasi, login ditolak; tautan konfirmasi di browser pendaftaran membuka beranda warga. |
| Konfirmasi email nonaktif (lingkungan uji) | Registrasi langsung membuka beranda dengan sesi aktif. |
| NIK duplikat atau identitas tidak valid | Pendaftaran gagal; tidak meninggalkan Auth user tanpa profil. |
| Email/password salah | Tidak membuka beranda; pesan kesalahan aman; input dipertahankan. |
| Muat ulang halaman warga | Sesi valid mempertahankan login. |
| Keluar, tombol Back, atau buka `/warga` langsung | Kembali ke login tanpa menampilkan data profil sebelumnya. |
| Panggil REST dengan token sesi yang telah logout | Tidak menghasilkan baris profil meskipun JWT belum mencapai expiry. |
| Warga A meminta profil B melalui REST | Tidak menghasilkan baris milik B. |
| Warga mencoba menulis role/status/profil | Ditolak oleh privilege database. |
| Nonaktifkan profil melalui SQL Editor lalu lakukan REST dengan token lama | Profil tidak dapat dibaca. Halaman terbuka memeriksa ulang saat fokus atau setiap 60 detik. |
| Ubah metadata Auth menjadi role pengurus | Tidak mengubah role yang tersimpan pada profil. |
| Chrome desktop dan browser ponsel | Label/input/tombol dapat digunakan dan halaman tidak bergulir horizontal. |

Catat hasil aktual, tanggal, konfigurasi konfirmasi email, dan bukti sebelum menyatakan integrasi Supabase nyata lulus.
