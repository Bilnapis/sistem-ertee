---
name: ErTee Resident Management
version: 1.0.0
colors:
  primary: '#087e34'
  on-primary: '#ffffff'
  brand: '#0ea546'
  surface: '#ffffff'
  on-surface: '#0f172a'
  background: '#f8fafc'
  on-background: '#0f172a'
  muted: '#64748b'
  soft: '#f1f5f9'
  success: '#dcfce7'
  on-success: '#166534'
  warning: '#fef3c7'
  on-warning: '#92400e'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 21px
rounded:
  button: 12px
  input: 12px
  card: 20px
  dialog: 22px
spacing:
  unit: 4px
  page: 24px
  field-gap: 16px
  dialog-padding: 28px
components:
  primary-button:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.button}'
    height: 48px
  resident-table:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.card}'
  table-header:
    backgroundColor: '{colors.soft}'
    textColor: '{colors.on-surface}'
  helper-label:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.muted}'
  brand-avatar:
    backgroundColor: '{colors.brand}'
  status-active:
    backgroundColor: '{colors.success}'
    textColor: '{colors.on-success}'
  status-pending:
    backgroundColor: '{colors.warning}'
    textColor: '{colors.on-warning}'
---

# ErTee — Manajemen Warga

Acuan adalah `design.fig`, frame daftar `0:4505`, detail `0:4584`, edit
`0:4697`, dan tambah `0:4798`, seluruhnya 1648 × 1056 px. File desain
dibaca langsung menggunakan CLI OpenPencil tanpa mengubah sumbernya.

Token global berada di `src/styles.css`; utility Tailwind ditulis pada JSX
komponen pemilik tampilannya. Seluruh tombol memakai `Button` atau `ButtonLink`
dari `src/components/Button.tsx`, tanpa override `className` atau `style`.
Font Inter dan ikon Lucide menggunakan dependensi yang sudah tersedia.
Border tabel memakai token `--color-border: #dce4ee`; border idle input, pencarian,
dan filter memakai `--color-control-border: #e2e8f0`. State hover, fokus, error,
dan disabled mengikuti warna masing-masing.

| Keputusan           | Implementasi                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Sidebar             | Sidebar desktop 264 px, dapat diciutkan menjadi 80 px melalui tombol ikon di header; drawer mobile memakai label menu lengkap. |
| Tabel               | Header lembut, permukaan putih, radius 20 px, NIK tersamarkan.                                                                 |
| Kepadatan daftar    | Judul 32 px desktop / 28 px area sempit; teks tabel 14 px, badge role 12 px, angka ringkasan 24 px. Ukuran teks memakai `rem`. |
| Area konten         | Maksimal 96rem, gutter 24 px desktop / 16 px area sempit; kolom tabel memiliki proporsi tetap.                                 |
| Filter daftar       | Label terlihat, input/select 16 px, tinggi minimum 48 px, susunan mengikuti container halaman.                                 |
| Dialog              | Maksimal 1000 px, radius 22 px, form dua kolom dengan gap 16 px.                                                               |
| Ponsel              | Form satu kolom di bawah 640 px; tabel digulir di dalam region sendiri.                                                        |
| Role dan verifikasi | Badge role di bawah nama; ringkasan verifikasi di atas pencarian.                                                              |
| Form akun           | Tambahan email, role, status, password dan konfirmasi pada alur tambah.                                                        |

Penyesuaian halaman daftar setelah implementasi awal mengikuti permintaan
perbaikan layout. Ringkasan menjadi dua kolom dengan angka di sisi akhir pada
area sempit. Tabel yang melebihi area konten menampilkan petunjuk gulir yang
terlihat. Rincian pengukuran dan pemeriksaan ada di `docs/residents-layout.md`.
Kartu ringkasan bersifat informatif dan tidak dapat dipilih sebagai filter.

`SummaryCardView` menjadi komponen bersama untuk ringkasan Data Warga,
Pengajuan Surat, dan Iuran Warga. Seluruh gaya kartu, warna nilai, grid,
dan aturan responsif berada di `src/components/SummaryCardView.tsx`.
API dan aturan penggunaannya ada di `docs/summary-card-view.md`.

`PageIntro` menyamakan judul dan deskripsi halaman daftar Data Warga,
Pengajuan Surat, dan Iuran Warga dengan acuan menu Warga. Gaya bersama
berada di `src/components/PageIntro.tsx`: judul 32 px dengan bobot 700
dan tracking -0.02em, deskripsi 14 px, serta jarak 6 px. Judul menjadi 28 px
pada container di bawah 33rem.

`TablePagination` menyamakan tabel Data Warga, Pengajuan Surat, Iuran Warga,
dan Pengaduan dengan acuan tabel Data Warga yang sudah diterapkan: radius 8 px,
header `soft` 14 px semibold (600) dengan huruf kapital di awal judul saja,
isi 14 px,
padding sel 16 × 12 px, dan tombol pagination 44 px. Gaya tabel, badge,
status daftar, dan susunan pagination berada di `src/components/TablePagination.tsx`.
Tombol pagination dan tautan aksi memakai `Button` serta `ButtonLink`. Komponen
tidak menerima override `className` atau `style`; halaman hanya memasok
data, konfigurasi kolom, dan callback. API ada di `docs/table-pagination.md`.

Daftar Data Warga, Pengajuan Surat, Iuran Warga, dan Pengaduan memakai prop
`toolbar` untuk menyatukan pencarian, filter, tabel, dan pagination dalam satu
panel putih beradius 8 px, border `border`, padding 16 px, dan gap 20 px sesuai
referensi terbaru, termasuk daftar pribadi dan pengurus. Label toolbar tetap
tersedia untuk pembaca layar; placeholder pencarian serta pilihan "Semua
status", "Semua jenis", "Semua kategori", dan "Semua metode" memberi konteks
visual. Label bulan tersedia untuk pembaca layar; label rentang tanggal tetap
terlihat. Tombol reset filter berada di dalam toolbar. Toolbar menjadi satu kolom pada container sempit;
tabel tetap memiliki border di seluruh sisi, radius 8 px, dan region gulir
tersendiri.

Warna merek asli `#0ea546` dipertahankan. Tombol fitur dengan teks putih
kecil memakai `#087e34`, dengan rasio kontras 5,19:1; warna merek asli
memberikan 3,24:1. Penyesuaian ini mendukung teks normal WCAG AA.
Status selalu memiliki label teks; fokus memakai outline global.

Token warna, spasi, dan radius tambahan mengikuti elemen referensi.
Ringkasan verifikasi, riwayat, status gagal/memuat/kosong, serta kontrol
akun melengkapi kebutuhan fungsional yang tidak seluruhnya digambar.

## Pengajuan surat

Implementasi surat mengikuti Page 2 pada `design.fig`: daftar admin `0:4901`,
daftar belum diproses `0:4988`, detail `0:5080`/`0:5221`, formulir `0:3965`,
pemilih jenis `0:4062`, dan daftar tanpa ringkasan `0:5405`. File desain
tetap utuh. Status Menunggu pada sumber diganti **Pengajuan** sesuai keputusan pengguna.

- Formulir maksimal 1000 px, radius 22 px, padding 28 px, dua kolom dengan
  gap 16 px. Pemilih jenis maksimal 528 px, radius 22 px, padding 28 px.
  Detail maksimal 912 px, radius 22 px, dengan tinggi mengikuti isi.
- Gunakan `TextInput`, sidebar 264 px, Inter dan Lucide yang sudah tersedia.
  Gaya surat memakai utility Tailwind; seluruh dialog memakai token radius 22 px.
- Tombol memakai token aksi `#087e34`. Badge Pengajuan kuning, Diproses biru,
  Selesai hijau; seluruhnya menyertakan label teks.
- Label filter tetap aksesibel, pagination empat baris, tanggal WIB, dan tabel
  berada di region gulir tersendiri. Formulir/detail satu kolom di bawah 640 px.
- Daftar pribadi mengadaptasi tabel sumber dengan nomor pengajuan dan tombol
  Ajukan Surat; admin mendapat tautan Pengajuan saya. Riwayat, lampiran,
  kelayakan profil dan status gagal/memuat/kosong melengkapi kebutuhan fungsional.
- Dialog bertingkat memakai native dialog, Escape menutup dialog paling atas,
  dan fokus dikembalikan ke pemicu. Navigasi ponsel memakai drawer yang tersedia.

Perbandingan browser dan batas pengujian dicatat di `docs/letter-requests.md`.

## Iuran warga bulanan

Acuan langsung `design.fig`: belum bayar `0:4158`, pembayaran `0:4216`, dan
lunas `0:4319`, seluruhnya 1648 × 1056 px. Token global, sidebar/header aplikasi,
Inter, Lucide dan `TextInput` tetap digunakan. Kartu beradius 20 px; dialog
maksimal 648 px, radius 22 px, padding 28 px. Tombol memakai token aksi
aksesibel `#087e34` dan status selalu berlabel teks.

Dua ringkasan bulan berjalan dipakai konsisten. Pilihan Tunai/Cash dan Transfer,
tanggal pembayaran, filter, pagination, detail/riwayat dan halaman pengurus
melengkapi keputusan fitur. Form/detail menjadi satu kolom di bawah 640 px;
tabel bergulir dalam region sendiri. Perbandingan pada 375, 768 dan 1648 px
serta batas pengujian ada di `docs/monthly-dues.md`.

## Styling Tailwind

Seluruh komponen dan halaman, termasuk preview, memakai Tailwind v4. Token berada
di `src/styles.css`; utility field, kartu, badge dan dialog ditulis pada JSX
komponen pemiliknya. Tombol aksi, tautan berbentuk tombol, kontrol ikon,
pagination, menu akun dan kontrol password memakai `Button` atau `ButtonLink`.
Komponen tersebut memusatkan gaya dasar dari tombol Tambah warga, varian
`solid`, `outline`, `ghost`, `danger`, ukuran, ikon, fokus dan disabled. Parent
mengatur layout tanpa selector untuk mengubah tampilan tombol. API tersedia
di `docs/button.md`; preview pengembangan ada pada `/preview/button`.
Tidak ada CSS Modules atau `@apply`.

Tombol utama/sekunder/destruktif minimal 48 px dengan teks 14 px; navigasi ringkas
dan tombol ikon minimal 44 px. Semua input/select minimal 48 px dengan teks 16 px,
label 14 px dan helper 12 px. Tombol dan input beradius 12 px, kartu utama 20 px,
kartu ringkasan 14 px, serta dialog 22 px. Aksi utama memakai `#087e34` dan hover
`#076b2c`; `#0ea546` tetap menjadi identitas merek. Gutter halaman 24 px atau
16 px di area sempit; gap field 16 px.

Container halaman diberi nama `page`; header dan menu akun menargetkan
`authenticated-content`. Lebar sidebar, batas lebar konten/dialog dan ambang
container tetap mengikuti layout sebelumnya. CSS khusus hanya mengatur dasar
dokumen dan transisi native drawer. Catatan migrasi dan validasi berada di
`docs/tailwind-migration.md`.

## Pengaduan warga

Belum tersedia frame khusus pengaduan dalam `design.fig`. Halaman mengadaptasi
pola daftar surat `0:4901`, formulir `0:3965`, serta detail `0:5080` tanpa
mengubah desain sumber. PageIntro, SummaryCardView, TablePagination dan TextInput
memakai komponen bersama. Sidebar/header yang tersedia tetap menjadi shell.

Formulir maksimal 1000 px dan detail 912 px, radius 22 px, padding desktop 28 px,
gap field 16 px, serta kontrol minimum 48 px. Formulir menjadi satu kolom di bawah
640 px; tabel bergulir dalam region sendiri. Empat kartu pengelola menyajikan
Diajukan, Diproses, Selesai dan Ditolak sesuai seluruh filter sebelum pagination.
Status memakai badge warning/info/success/danger beserta label teks.

Konfirmasi penolakan memakai dialog bertingkat maksimal 528 px dan menyebut judul
pengaduan. Riwayat, alasan penolakan, hasil penanganan dan keadaan gagal/memuat/kosong
melengkapi kebutuhan PRD. Screenshot responsif dan batas pengujian dijelaskan di
`docs/pengaduan.md`.

## Pengumuman terjadwal

Halaman pengumuman mengikuti pola komponen dan token aplikasi yang sudah ada.
Pengelolaan memakai PageIntro, TablePagination dan TextInput; pembaca memakai
kartu putih beradius 20 px. Beranda memuat tiga kartu di atas profil dan tautan
Lihat semua; halaman profil tetap berfokus pada profil. Kartu memuat judul,
cuplikan maksimal tiga baris, jadwal WIB dan tautan detail. Teks lengkap pada
detail mempertahankan baris baru tanpa menafsirkan HTML.

Dialog formulir maksimal 1000 px, detail 912 px, konfirmasi 528 px, radius 22 px,
padding desktop 28 px dan gap field 16 px. Field jadwal dua kolom di desktop dan
satu kolom di bawah 640 px. Status Terjadwal/Sedang tayang/Selesai/Diarsipkan
memakai token info/success/soft/warning beserta label. Semua tombol utama 48 px,
navigasi ringkas 44 px. Lihat `docs/pengumuman.md` untuk pengujian dan pemasangan.
