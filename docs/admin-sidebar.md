# Sidebar admin

Komponen [`AdminSidebar`](../src/components/AdminSidebar.tsx) diadaptasi dari komponen `Sidebar / ErTee / Admin` (`0:4332`) dalam `design.fig` dengan ukuran yang lebih ringkas untuk dashboard. Styling memakai utility Tailwind di komponen; warna dan radius berasal dari token bersama.

Informasi akun telah dipindahkan ke [menu akun pada header](account-menu.md).
Sidebar desktop maupun drawer mobile memuat identitas RT, navigasi, dan
identitas produk **ErTee** di bagian bawah dengan gaya merek seperti pada header:
nama hijau 20 px dan subjudul “Layanan Digital Warga” 12 px, tersusun vertikal
dengan jarak 2 px dan rata awal. Warna subjudul mengikuti teks sekunder sidebar
untuk latar gelap. Identitas produk mengikuti alur scroll pada layar pendek dan
bersifat dekoratif agar nama produk tidak dibacakan berulang.

## Penggunaan

Render di dalam React Router yang sudah digunakan aplikasi. Identitas RT diberikan oleh halaman induk:

```tsx
import { AdminSidebar } from './components/AdminSidebar'

;<AdminSidebar communityLabel="ADMIN RT 04" basePath="/admin" />
```

`className` dapat digunakan untuk menyesuaikan penempatan oleh layout induk. `paths` dapat menyesuaikan URL setiap menu dan `onNavigate` dipanggil saat link dipilih. Tinggi default mengikuti viewport (`100dvh`); sidebar dapat digulir pada viewport pendek agar seluruh menu tetap terjangkau.

| Menu            | Tujuan default           |
| --------------- | ------------------------ |
| Dashboard       | `/admin`                 |
| Warga           | `/admin/warga`           |
| Pengajuan Surat | `/admin/pengajuan-surat` |
| Iuran Warga     | `/admin/iuran-warga`     |
| Pengaduan       | `/admin/pengaduan`       |

Penanda menu aktif memakai `NavLink` dan mengikuti URL, termasuk halaman detail di bawah masing-masing modul. Dashboard cocok tepat pada route dasarnya. Link aktif mendapat `aria-current="page"`; ikon dekoratif tidak dibacakan screen reader.

## Pratinjau lokal

Jalankan `npm run dev`, lalu buka `/preview/admin-sidebar`. Route ini hanya disertakan dalam mode development.

## Ukuran dan batas integrasi

| Elemen     | Sebelumnya                                              | Sekarang                                                                                                                                                |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar    | Lebar 320 px, padding 32 px vertikal / 28 px horizontal | Lebar `16.5rem` (264 px), padding 24 px vertikal / 16 px horizontal. Lebar sidebar, kolom layout, dan drawer memakai token `--sidebar-width` yang sama. |
| Warna      | Latar `#0f172a`, aktif `#0ea546`                        | Token `--color-ink` dan `--color-brand`.                                                                                                                |
| Menu       | Tinggi minimum 60 px, gap 12 px, radius 16 px           | Tinggi minimum 44 px, gap 4 px, radius 12 px. Padding vertikal 10 px memungkinkan label panjang membungkus.                                             |
| Ikon       | Lucide, ukuran 24 px, stroke 2 px                       | Lucide, ukuran 20 px, stroke 2 px.                                                                                                                      |
| Tipografi  | Inter; merek 32/800, menu 18/600, menu aktif 18/800     | Inter; merek 28/800, menu 14/600 termasuk menu aktif, label RT 12/600. Ukuran memakai `rem`, line-height unitless.                                      |
| Kartu akun | Ditampilkan pada bagian bawah sidebar                   | Dihapus dari sidebar; informasi dan tindakan akun tersedia pada header.                                                                                 |

Nilai piksel di atas berlaku pada ukuran font root 16 px. Logo, label RT, dan ikon menu berbagi tepi awal 28 px. Jarak antarkelompok 32 px membedakan identitas dan navigasi; tinggi navigasi mengikuti isinya.

Sidebar telah dipasang pada layout semua halaman terlindungi setelah login. Label WARGA/ADMIN mengikuti peran. Pada desktop sidebar berada di sisi awal sesuai arah dokumen; pada lebar di bawah 1024 px tombol menu membuka dialog navigasi yang mendukung Escape dan menutup setelah memilih menu. Drawer menyisakan ruang untuk tombol tutup pada header serta mengikuti tinggi viewport dinamis. Tindakan Keluar tersedia pada submenu akun di header.

Dashboard memakai `/warga` dan menu Warga membuka profil sendiri pada `/warga/profil`. Pengajuan Surat, Iuran Warga, dan Pengaduan membuka halaman keterangan layanan yang belum tersedia di bawah prefix `/warga`. Seluruh route tersebut berada di dalam pemeriksaan sesi/profil yang sama. Komponen tidak memberikan hak akses admin; pengelolaan data lintas warga belum diimplementasikan.

## Transisi drawer mobile

Drawer bergeser dari sisi awal dokumen saat dibuka selama 300 ms dengan `cubic-bezier(0.2, 0, 0, 1)`, lalu bergeser keluar selama 200 ms dengan `ease-out`. Overlay ikut memudar. Arah geser mengikuti RTL. Transisi CSS `display` dan `overlay` mempertahankan drawer selama animasi keluar; tidak ada penundaan JavaScript sebelum pemanggilan `close()`.

Jika `prefers-reduced-motion: reduce` aktif, drawer dan overlay hanya memudar selama 150 ms tanpa pergeseran. Selama drawer terbuka, halaman latar tidak bergulir dan scroll sidebar tidak diteruskan ke halaman. Drawer dapat ditutup melalui tombol X, ketukan pada backdrop, Escape, atau memilih tautan navigasi.

## Verifikasi implementasi awal

Catatan berikut merekam implementasi awal, termasuk kartu akun yang kini sudah
dihapus. Verifikasi menu akun pada header dicatat di `docs/account-menu.md`.

Build TypeScript/Vite dan lint lulus. Seluruh 18 pengujian E2E lulus, termasuk sesi login/logout, navigasi aktif, membuka drawer, tombol tutup, ketukan pada backdrop, Escape, pengembalian fokus, dan menutup drawer setelah navigasi.

Transisi drawer diperiksa di Chrome pada kecepatan 10%: opacity dan posisi berada di antara keadaan tertutup/terbuka saat masuk dan keluar, lalu drawer menghilang setelah transisi selesai. Pada RTL drawer masuk dari kanan. Pada reduced motion tidak ada transform; fade masuk dan keluar tetap berjalan 150 ms. Scroll halaman terkunci saat drawer terbuka dan kembali setelah ditutup. Not verified: perilaku transisi dan ketukan backdrop pada browser selain Chrome.

Pemeriksaan Chrome pada layout terautentikasi memakai profil dummy dan lebar 320, 360, 640, 768, 1023, 1024, 1280, 1440, 1648, dan 2560 px. Ukuran terhitung: sidebar 264 px, menu 14 px dengan tinggi minimum 44 px. Tidak ada overflow horizontal. Pada tinggi 320 px, seluruh menu dan akun tetap dapat dicapai melalui scroll. Posisi drawer dan sidebar tercermin dengan benar pada RTL desktop dan mobile.

Label pseudo-localization, teks navigasi bahasa Jerman, nama panjang tanpa spasi, dan peran panjang diperiksa pada sidebar desktop dan drawer mobile: teks membungkus tanpa elipsis maupun overflow. Pembesaran teks root 200% pada lebar 320 px tetap memungkinkan akses akun. Zoom browser Chrome 200% diperiksa pada pratinjau komponen dan layout terautentikasi: viewport efektif 720 × 450 px, DPR 2, tanpa overflow horizontal. Pada layout terautentikasi, akun tetap dapat dicapai, Escape mengembalikan fokus, dan memilih menu menutup drawer serta membuka halaman tujuan.

## Laporan perbaikan layout awal

### Plan for growth and clipping

| Severity      | Location                          | Before                                                                                       | After                                                     | Why                                                                                    |
| ------------- | --------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| HIGH, selesai | `src/components/AdminSidebar.tsx` | Nama/peran satu baris terpotong dengan elipsis; nilai lengkap bergantung pada hover `title`. | Teks membungkus dan kartu bertambah tinggi mengikuti isi. | Plan for growth and clipping: nilai lengkap terbaca melalui keyboard dan layar sentuh. |

### Logical properties for anything that mirrors

| Severity        | Location                                                                           | Before                                                   | After                                                | Why                                                                  |
| --------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| MEDIUM, selesai | `src/components/AuthenticatedLayout.tsx`, `src/components/AuthenticatedLayout.tsx` | Drawer dan tombol tutup memakai posisi fisik kiri/kanan. | Memakai `inset-inline-start` dan `inset-inline-end`. | Logical properties: posisi navigasi mengikuti arah dokumen pada RTL. |

### Align to shared edges

| Severity     | Location                                                                                                | Before                                                          | After                   | Why                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| LOW, selesai | `src/components/AdminSidebar.tsx`, `src/components/AdminSidebar.tsx`, `src/components/AdminSidebar.tsx` | Logo mulai pada 28 px, ikon menu pada 48 px, avatar pada 44 px. | Semua mulai pada 28 px. | Align to shared edges: identitas, navigasi, dan akun membentuk satu struktur yang mudah dipindai. |

### Transitions for interactive state

| Severity        | Location                                                                           | Before                                               | After                                                                                                                        | Why                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| MEDIUM, selesai | `src/components/AuthenticatedLayout.tsx`, `src/components/AuthenticatedLayout.tsx` | Drawer dan overlay muncul serta menghilang seketika. | Drawer bergeser, overlay memudar, dan transisi keluar selesai sebelum elemen disembunyikan. Reduced motion menggunakan fade. | Transitions for interactive state: perubahan posisi navigasi lebih mudah diikuti saat membuka dan menutup. |

### Contain scroll inside overlays

| Severity        | Location                                                                           | Before                                                               | After                                                                                         | Why                                                                                        |
| --------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| MEDIUM, selesai | `src/components/AuthenticatedLayout.tsx`, `src/components/AuthenticatedLayout.tsx` | Scroll drawer tidak dibatasi dan halaman latar masih dapat bergulir. | Scroll halaman dikunci saat drawer terbuka; sidebar memakai `overscroll-behavior-y: contain`. | Contain scroll inside overlays: menggulir navigasi tidak menggeser halaman di belakangnya. |

Approve — cakupan sidebar dan drawer yang diperiksa di Chrome.

Catatan migrasi Tailwind: tabel pemeriksaan di atas merupakan riwayat perbaikan. Lokasi kode telah diperbarui ke implementasi Tailwind; pengukuran historis bukan baseline visual baru. Lihat `docs/tailwind-migration.md`.
