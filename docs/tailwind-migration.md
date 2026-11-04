# Migrasi styling Tailwind

Migrasi menghapus seluruh 11 CSS Modules dan selector halaman dalam CSS global.
Tailwind dan plugin Vite memakai rentang `^4.3.3`. Font Inter, ikon Lucide,
susunan halaman, route, kontrak komponen dan aturan bisnis tetap dipertahankan.

## Struktur dan aturan

- `src/styles.css`: token `@theme`, dasar dokumen di `@layer base`, serta
  transisi native drawer di `@layer components`. Tidak ada `@apply`.
- `src/components/ui.ts`: utility tombol primary/secondary/danger/text,
  kontrol formulir, kartu, badge, heading dan permukaan dialog.
- `src/lib/cn.ts`: `clsx` untuk kondisi dan `tailwind-merge` untuk override.
  Letakkan class dari pemanggil setelah class default.
- Komponen bersama dan preview memakai utility di JSX. Fitur memakai
  kumpulan utility statis di `styles.ts` untuk digunakan bersama oleh daftar,
  form dan dialog. Nama class ditulis lengkap agar terdeteksi saat build.
- Container `page` mempertahankan ambang fitur dan ringkasan. Container
  `authenticated-content` mengatur header dan menu akun setelah sidebar.
- Prettier memuat `prettier-plugin-tailwindcss`, menggunakan entry stylesheet
  proyek dan mengurutkan utility pada `className` serta pemanggilan `cn`.

## Standar visual

| Elemen                     | Nilai                                                         |
| -------------------------- | ------------------------------------------------------------- |
| Brand / aksi / hover       | `#0ea546` / `#087e34` / `#076b2c`                             |
| Tombol                     | Minimum 48 px; ikon/navigasi ringkas 44 px; radius 12 px      |
| Input/select               | Minimum 48 px, teks 16 px, radius 12 px                       |
| Textarea                   | Teks 16 px; tinggi mengikuti kebutuhan isi, minimum 96–100 px |
| Kartu / ringkasan / dialog | Radius 20 / 14 / 22 px                                        |
| Halaman / field            | Gutter 24 px desktop dan 16 px sempit; gap field 16 px        |
| Tipografi                  | Judul halaman 32/28 px, teks dan label 14 px, helper 12 px    |

Lebar sidebar tetap 264 px. Batas konten 96rem, kartu autentikasi 560/900 px,
serta dialog warga/surat/iuran tetap mengikuti batas sebelumnya. Tinggi kartu
autentikasi mengikuti isi; copyright kini berada dalam alur dokumen. Warna
status dan label teksnya dipertahankan.

## Validasi

Baseline sebelum migrasi: **70 tes Playwright lulus** setelah cakupan screenshot
diperluas. Screenshot pembanding sebelum migrasi tersimpan sementara di
`/tmp/ertee-tailwind-before/screenshots`; hasil setelah migrasi di `test-results/`.
Keduanya merupakan artefak lokal yang tidak masuk Git.

Pengujian mencakup alur autentikasi, warga, surat, iuran, role, form gagal,
dialog bertingkat, Escape dan pemulihan fokus. Pemeriksaan input meliputi
keyboard, ref, prioritas error, disabled melalui fieldset, RTL, teks panjang,
teks 200%, reduced motion dan forced colors. Screenshot fitur memakai lebar
320, 375, 768, 1280 dan 1648 px.

Hasil akhir:

| Pemeriksaan                              | Hasil                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run build`                          | Lulus, termasuk TypeScript strict                                                   |
| `npm run lint`                           | Lulus; dijalankan melalui `rtk bypass` karena filter keluaran lint RTK sempat gagal |
| `npm test`                               | 47/47 lulus                                                                         |
| `npm run test:e2e -- --workers=4`        | 71/71 lulus                                                                         |
| Prettier pada seluruh berkas yang diubah | Lulus                                                                               |
| `git diff --check`                       | Lulus                                                                               |
| Sisa CSS Modules / impor CSS Modules     | 0 / 0                                                                               |

Screenshot sebelum dan sesudah masing-masing berjumlah 83. Gallery mandiri
`test-results/tailwind-comparison.html` memuat 25 pasangan pada lima lebar layar
untuk login, daftar warga, form surat, pembayaran iuran dan preview input. Gallery
menyertakan gambar sehingga dapat dibuka tanpa server; artefak ini diabaikan Git
dan direktori `test-results` akan diganti ketika Playwright dijalankan lagi.

Pemeriksaan visual meliputi daftar warga desktop/ponsel, dialog tambah warga,
form surat desktop/ponsel, pembayaran iuran, tagihan pada 320 px, login desktop
dan preview input pada 320 px. Susunan halaman dipertahankan; warna aksi, border
kontrol, ukuran teks, tombol dan radius mengikuti standar baru.

Ukuran CSS build sebelum migrasi: total 66,66 kB (gzip 15,34 kB), tersebar pada
beberapa chunk. Sesudah migrasi: 73,31 kB (gzip 13,64 kB) dalam satu stylesheet.
Utility fitur kini ikut dimuat pada stylesheet awal; `tailwind-merge` dan string
utility menambah JavaScript. Migrasi ini tidak menjanjikan pengurangan seluruh
ukuran bundle.

Pemeriksaan format awal menemukan 32 berkas yang belum mengikuti Prettier.
Migrasi memformat berkas yang disentuh. `npm run format:check` masih melaporkan
16 berkas lama yang tidak disentuh: `docs/auth-acceptance.md`, `index.html`,
`playwright.config.ts`, `src/features/auth/{AuthProvider.tsx,errors.ts,validation.ts}`,
`src/features/residents/data.tsx`, `src/lib/supabase.ts`, `src/main.tsx`,
`supabase/functions/_shared/resident.ts`,
`supabase/functions/create-resident/{handler.ts,index.ts}`,
`tests/{database,provisioning,residents-database}.test.mjs`, dan `vercel.json`. Safari/Firefox, perangkat iOS fisik dan screen reader nyata belum
diverifikasi.
