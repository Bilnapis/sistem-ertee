---
name: ErTee Resident Management
version: 1.0.0
colors:
  primary: "#087e34"
  on-primary: "#ffffff"
  brand: "#0ea546"
  surface: "#ffffff"
  on-surface: "#0f172a"
  background: "#f8fafc"
  on-background: "#0f172a"
  muted: "#64748b"
  soft: "#f1f5f9"
  success: "#dcfce7"
  on-success: "#166534"
  warning: "#fef3c7"
  on-warning: "#92400e"
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: "700"
    lineHeight: 40px
  headline-md:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: "800"
    lineHeight: 40px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 21px
rounded:
  button: 12px
  input: 14px
  card: 20px
  dialog: 22px
spacing:
  unit: 4px
  page: 24px
  field-gap: 16px
  dialog-padding: 28px
components:
  primary-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.button}"
    height: 48px
  resident-table:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.card}"
  table-header:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.on-surface}"
  helper-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
  brand-avatar:
    backgroundColor: "{colors.brand}"
  status-active:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-success}"
  status-pending:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-warning}"
---

# ErTee — Manajemen Warga

Acuan adalah `design.fig`, frame daftar `0:4505`, detail `0:4584`, edit
`0:4697`, dan tambah `0:4798`, seluruhnya 1648 × 1056 px. File desain
dibaca langsung menggunakan CLI OpenPencil tanpa mengubah sumbernya.

Token global berada di `src/styles.css`; gaya fitur memakai CSS Modules.
Font Inter dan ikon Lucide menggunakan dependensi yang sudah tersedia.
Batas input dan tabel memakai token `--color-input-border: #dce4ee`.

| Keputusan | Implementasi |
| --- | --- |
| Sidebar | Pertahankan komponen 264 px dan drawer yang sudah diterapkan. |
| Tabel | Header lembut, permukaan putih, radius 20 px, NIK tersamarkan. |
| Kepadatan daftar | Judul 32 px desktop / 28 px area sempit; teks tabel 14 px, badge role 12 px, angka ringkasan 24 px. Ukuran teks memakai `rem`. |
| Area konten | Maksimal 96rem, gutter 24 px desktop / 16 px area sempit; kolom tabel memiliki proporsi tetap. |
| Filter daftar | Label terlihat, input/select 16 px, tinggi minimum 44 px, susunan mengikuti container halaman. |
| Dialog | Maksimal 1000 px, radius 22 px, form dua kolom dengan gap 16 px. |
| Ponsel | Form satu kolom di bawah 640 px; tabel digulir di dalam region sendiri. |
| Role dan verifikasi | Badge role di bawah nama; ringkasan verifikasi di atas pencarian. |
| Form akun | Tambahan email, role, status, password dan konfirmasi pada alur tambah. |

Penyesuaian halaman daftar setelah implementasi awal mengikuti permintaan
perbaikan layout. Ringkasan menjadi dua kolom dengan angka di sisi akhir pada
area sempit. Tabel yang melebihi area konten menampilkan petunjuk gulir yang
terlihat. Rincian pengukuran dan pemeriksaan ada di `docs/residents-layout.md`.
Kartu ringkasan bersifat informatif dan tidak dapat dipilih sebagai filter.

Warna merek asli `#0ea546` dipertahankan. Tombol fitur dengan teks putih
kecil memakai `#087e34`, dengan rasio kontras 5,19:1; warna merek asli
memberikan 3,24:1. Penyesuaian ini mendukung teks normal WCAG AA.
Status selalu memiliki label teks; fokus memakai outline global.

Token warna, spasi, dan radius tambahan mengikuti elemen referensi.
Ringkasan verifikasi, riwayat, status gagal/memuat/kosong, serta kontrol
akun melengkapi kebutuhan fungsional yang tidak seluruhnya digambar.
