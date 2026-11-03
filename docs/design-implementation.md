# Implementasi desain autentikasi

Sumber: `design.fig`, OpenPencil, frame `Login / ErTee / Desktop` (`0:3801`) dan `Register / ErTee / Desktop` (`0:3824`). Keduanya berukuran 1440 × 928 px. Desain asli tidak diubah.

| Elemen | Desain | Implementasi |
| --- | --- | --- |
| Latar | `#f8fafc` | Sama. |
| Font | Inter, judul 32 px/800, deskripsi 16 px | Inter lokal dengan nilai sama. |
| Tombol utama | `#0ea546`, radius 12 px | Sama. |
| Kartu login | 560 × 540 px, radius 20 px, padding horizontal 40 px | Sama pada viewport referensi. |
| Input login | Tinggi 60 px, radius 14 px | Sama. |
| Kartu register | 900 × 672 px, radius 20 px, padding 32 px | Sama pada viewport referensi. |
| Formulir register | Dua kolom, gap horizontal 16 px, vertikal 12 px, input 52 px | Sama pada desktop. |
| Layout ponsel | Frame ponsel belum tersedia | Adaptasi satu kolom pada lebar di bawah 640 px. |
| Identitas login | Nomor HP atau NIK | **Email**, mengikuti AS-01 PRD dan Supabase Auth pada tahap pertama. |
| Lupa password | Tautan | Dialog petunjuk menghubungi pengurus; pemulihan mandiri di luar tahap ini. |

Screenshot browser diambil pada 360, 768, 1280, dan 1440 px. Desktop 1440 × 928 dibandingkan dengan ekspor kedua frame. Layout pada ukuran lain merupakan adaptasi responsif karena tidak ada frame pembanding. Pengujian mengukur kartu desktop dan memeriksa overflow horizontal.

Status memuat, gagal, konfirmasi email, fokus keyboard, dan halaman profil setelah login melengkapi alur fungsional yang belum digambar pada dua frame autentikasi. Pesan persiapan koneksi hanya muncul bila konfigurasi Supabase belum tersedia. Data profil pada aplikasi berasal dari Supabase; data dummy pada pengujian hanya berada di fixture test.
