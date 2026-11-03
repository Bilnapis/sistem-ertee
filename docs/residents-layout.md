# Pemeriksaan layout halaman warga

Perbaikan mencakup `ResidentsPage` dan gaya halaman daftar dalam CSS Modules.
Pemeriksaan menggunakan Chrome, akun dan respons Supabase dummy, font Inter
yang sudah tersedia, serta skala jarak proyek 4/8/12/16/24/32 px.

## Hint at hidden content

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH, selesai | `src/features/residents/ResidentsPage.tsx:65`, `src/features/residents/Residents.module.css:136` | Pada 320 px, tabel 740 px berada dalam region 278 px; petunjuk gulir hanya tersedia melalui nama aksesibel. | Petunjuk dengan ikon dan teks terlihat pada area yang lebih sempit daripada tabel. Region tetap dapat digulir dengan keyboard atau sentuhan. | Hint at hidden content: pengguna mengetahui bahwa kolom status dan aksi tersedia di sisi berikutnya. |

## Order by importance; Group with space, not lines

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM, selesai | `src/features/residents/Residents.module.css:12`, `src/features/residents/Residents.module.css:32`, `src/features/residents/Residents.module.css:46`, `src/features/residents/Residents.module.css:72` | Judul desktop 40 px, baris tabel sekitar 83 px. Pada 320 px tabel mulai pada y=799. | Judul desktop 32 px, area sempit 28 px; baris data normal sekitar 72 px. Tabel pada 320 px mulai pada y=713. Jarak antarbagian 24 px dan antarkontrol 12 px. | Order by importance: daftar lebih cepat terlihat. Group with space: identitas halaman, ringkasan, dan direktori mempunyai kelompok yang jelas. |

## Hold structure until it breaks; Logical properties for anything that mirrors

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM, selesai | `src/features/residents/ResidentsPage.tsx:55`, `src/features/residents/Residents.module.css:50`, `src/features/residents/Residents.module.css:58`, `src/features/residents/Residents.module.css:89`, `src/features/residents/Residents.module.css:136` | Filter memakai flex-wrap dan breakpoint viewport; label disembunyikan. Padding select memakai sisi fisik dan ikon navigasi tetap menunjuk ke arah LTR. | Label filter terlihat; grid berpindah susunan menurut lebar container. Padding memakai inline-start/end, ikon arah tercermin pada RTL, angka/NIK diisolasi dengan bdi. | Hold structure: isi menyesuaikan ruang sesungguhnya setelah sidebar. Logical properties: urutan, arah aksi, dan ruang select tetap benar ketika dicerminkan. |

## Align to shared edges; Plan for growth and clipping

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW, selesai | `src/features/residents/Residents.module.css:12`, `src/features/residents/Residents.module.css:66`, `src/features/residents/Residents.module.css:91` | Pada viewport 2560 px, tabel melebar sampai sekitar 2230 px; kolom mengikuti pembagian otomatis. | Konten dibatasi 96rem, tabel sekitar 1486 px pada viewport tersebut, dengan proporsi kolom tetap. Pagination dan teks panjang dapat membungkus. | Align to shared edges: hubungan judul, ringkasan, filter, tabel, dan pagination tetap jelas. Plan for growth: teks bertambah tinggi tanpa keluar dari area. |

## Tipografi

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM, selesai | `src/features/residents/Residents.module.css:58` | Select filter memakai font 14 px termasuk pada area sempit. | Input/select memakai 1rem, terukur 16 px pada ukuran teks dasar. | Inputs at 16px on mobile: ukuran nilai filter konsisten dan lebih mudah dibaca. |

Ukuran halaman memakai `rem` dan line-height unitless. Caption role yang
sebelumnya 11 px menjadi 12 px; input dan select 16 px. Angka ringkasan
memakai tabular-nums. Heading, label, nama warga, dan status dapat membungkus
tanpa elipsis; nama tetap dapat dibuka melalui detail warga.

## Verifikasi

- Lebar minimum 320 px sampai maksimum yang diperiksa 2560 px, termasuk
  360, 375, 640, 768, 1023/1024, 1280, 1648, dan 1920 px, serta sisi-sisi breakpoint
  container. Tidak ada overflow horizontal halaman atau kontrol yang overlap.
- Urutan RTL diperiksa pada lebar yang sama; tabel mempertahankan urutan
  identitas di sisi awal, kolom lain tetap dapat dicapai melalui gulir.
- Nama tanpa spasi 150 karakter, label Jerman yang panjang, dan
  pseudo-localization diperiksa pada 320, 768, dan 1280 px.
- Pembesaran teks root 200% diperiksa pada 320, 768, dan 1280 px.
- Zoom browser Chrome 200% diperiksa pada jendela 1440 × 900: viewport CSS
  menjadi 720 × 450, DPR 2. Tombol tambah, dialog, dan Escape tetap bekerja.
- Pengujian fungsional halaman memakai suite E2E warga yang sudah tersedia.
  Tidak ada perubahan aturan data atau API dalam perbaikan layout ini.
- Empat kelompok pemeriksaan layout dan sembilan tes E2E warga lulus.
  Build TypeScript/Vite, oxlint, serta linter DESIGN.md lulus; linter desain
  melaporkan nol error dan nol warning.
- Screenshot dan pemeriksaan ukuran dilakukan dengan browser. Harness
  eksplorasi sementara berada di `/private/tmp/ertee-residents-layout-audit`;
  tidak menjadi dependensi atau pengujian permanen aplikasi.

Not verified: perilaku layout/native select pada Safari dan Firefox, serta
perangkat iOS fisik.

Approve — cakupan halaman daftar dan pemeriksaan Chrome yang disebutkan di atas.
