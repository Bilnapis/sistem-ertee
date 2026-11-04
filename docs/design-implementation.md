# Implementasi desain autentikasi

Sumber: `design.fig`, OpenPencil, frame `Login / ErTee / Desktop` (`0:3801`) dan `Register / ErTee / Desktop` (`0:3824`). Keduanya berukuran 1440 × 928 px. Desain asli tidak diubah.

| Elemen            | Desain                                                       | Implementasi                                                               |
| ----------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Latar             | `#f8fafc`                                                    | Sama.                                                                      |
| Font              | Inter, judul 32 px/800, deskripsi 16 px                      | Inter lokal, judul 32/28 px dengan bobot 700; deskripsi 16/14 px.          |
| Tombol utama      | `#0ea546`, radius 12 px                                      | Aksi `#087e34`, radius 12 px, tinggi minimum 48 px. Brand tetap `#0ea546`. |
| Kartu login       | 560 × 540 px, radius 20 px, padding horizontal 40 px         | Lebar maksimum tetap; tinggi mengikuti isi setelah penyeragaman kontrol.   |
| Input login       | Tinggi 60 px, radius 14 px                                   | Minimum 48 px, radius 12 px, teks 16 px.                                   |
| Kartu register    | 900 × 672 px, radius 20 px, padding 32 px                    | Lebar maksimum tetap; tinggi mengikuti isi setelah penyeragaman kontrol.   |
| Formulir register | Dua kolom, gap horizontal 16 px, vertikal 12 px, input 52 px | Dua kolom pada desktop, gap 16 px, input minimum 48 px.                    |
| Layout ponsel     | Frame ponsel belum tersedia                                  | Adaptasi satu kolom pada lebar di bawah 640 px.                            |
| Identitas login   | Nomor HP atau NIK                                            | **Email**, mengikuti AS-01 PRD dan Supabase Auth pada tahap pertama.       |
| Lupa password     | Tautan                                                       | Dialog petunjuk menghubungi pengurus; pemulihan mandiri di luar tahap ini. |

Migrasi Tailwind mempertahankan susunan halaman dan lebar maksimum kartu, lalu menyeragamkan kontrol dengan fitur lain. Copyright mengikuti alur dokumen agar tetap terbaca pada layar pendek. Screenshot mencakup 320, 375, 768, 1280, 1440 dan 1648 px. Pengujian mempertahankan pemeriksaan lebar kartu desktop dan overflow, tanpa mengunci tinggi kartu lama. Perbandingan migrasi dicatat di `docs/tailwind-migration.md`.

Status memuat, gagal, konfirmasi email, fokus keyboard, dan halaman profil setelah login melengkapi alur fungsional yang belum digambar pada dua frame autentikasi. Pesan persiapan koneksi hanya muncul bila konfigurasi Supabase belum tersedia. Data profil pada aplikasi berasal dari Supabase; data dummy pada pengujian hanya berada di fixture test.
