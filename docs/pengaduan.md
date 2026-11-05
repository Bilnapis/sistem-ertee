# Pengaduan warga

Modul Pengaduan memenuhi alur Aspirasi warga ASP-01–ASP-05 pada PRD. Akun aktif
nonarsip dapat mengajukan pengaduan pribadi, termasuk akun yang profilnya belum
lengkap atau belum terverifikasi. Ketua RT dan Pengurus RT memiliki kewenangan
penanganan yang sama dan tetap dapat mengajukan pengaduan sendiri.

## Pemasangan

Setelah empat migrasi autentikasi, manajemen warga, surat, dan iuran, terapkan
`supabase/migrations/20261104000300_complaints.sql`. Migrasi menambah dua tabel,
empat RPC, helper RLS, serta trigger penjaga perubahan. Tidak ada seed, bucket,
Edge Function, scheduler, atau variabel lingkungan tambahan. Frontend memakai
konfigurasi Supabase yang sudah tersedia.

### Supabase lokal

Jalankan `npx --yes supabase start` dengan Docker tersedia. Pada inisialisasi
pertama, CLI menerapkan seluruh migrasi sesuai urutan nama berkas. Jika stack
lokal sudah berjalan dan hanya migrasi baru yang belum diterapkan, gunakan
`npx --yes supabase migration up` (target lokal secara default pada CLI 3.0.0).
Jangan mereset database yang berisi
data yang perlu dipertahankan hanya untuk menambahkan modul ini.

### Supabase cloud

Pastikan proyek tujuan sesuai `VITE_SUPABASE_URL` pada `.env.local`. Untuk
proyek yang sebelumnya dipasang melalui SQL Editor:

1. Periksa bahwa migrasi autentikasi, manajemen warga, surat, dan iuran sudah
   tersedia. Pastikan tabel `complaints` dan `complaint_events` belum ada.
2. Buka SQL Editor pada proyek yang benar dan jalankan seluruh isi
   `supabase/migrations/20261104000300_complaints.sql` satu kali. Berkas sudah
   membungkus perubahan dalam `begin`/`commit`; jangan menjalankan sebagian
   berkas atau mengulang migrasi CREATE TABLE yang sudah diterapkan.
3. Verifikasi kedua tabel, empat RPC, dua kebijakan SELECT, dan trigger
   `complaint_update_guard`. RLS harus aktif, role `authenticated` hanya
   memiliki SELECT langsung pada tabel, dan role `anon` tidak boleh memanggil
   RPC pengaduan. Penulisan pengguna tetap melalui RPC.
4. Frontend menggunakan URL dan publishable/anon key yang sudah tersedia;
   tidak perlu bucket, Edge Function, scheduler, maupun secret baru. Jangan
   memasukkan service-role key ke variabel `VITE_*`.

Penerapan melalui SQL Editor tidak otomatis mengisi riwayat migrasi CLI.
Sebelum beralih ke `db push`, login, hubungkan CLI ke proyek yang benar, lalu
periksa dan sinkronkan riwayat dengan `migration repair` hanya untuk versi
yang skemanya sudah dipastikan terpasang. Lihat juga
`docs/resident-management.md`. Jangan langsung menjalankan `db push` pada
proyek dengan riwayat kosong karena migrasi CREATE TABLE lama akan dicoba lagi.

### Penerapan cloud — 4 November 2026

- Proyek **Sistem ErTee** (`vzdkaqvrzsjrmnsbbkaz`), sesuai URL frontend.
  CLI belum memiliki access token dan belum terhubung; penerapan dilakukan
  melalui SQL Editor pada sesi dashboard yang sudah login.
- Sebelum penerapan, tabel prasyarat dan helper autentikasi/pengelola tersedia,
  sementara kedua tabel dan empat RPC pengaduan belum ada. Seluruh isi migrasi
  `20261104000300_complaints.sql` kemudian dijalankan tanpa perubahan.
- Pembacaan ulang database pada **4 November 2026 pukul 22.22 WIB** memverifikasi
  tabel `complaints` dan `complaint_events`, RLS aktif pada keduanya, dua
  kebijakan SELECT, serta trigger `complaint_update_guard` aktif.
- Keempat RPC tersedia dengan signature sesuai migrasi. `authenticated`
  memiliki EXECUTE, `anon` tidak. Role `authenticated` hanya memiliki SELECT
  langsung pada kedua tabel, tanpa INSERT/UPDATE/DELETE. Helper pembaca dapat
  dijalankan oleh `authenticated`; fungsi trigger tidak dapat dipanggil oleh
  `authenticated` maupun `anon`. Seluruh RPC memakai `search_path` kosong.
- Pengujian SQL sebagai `authenticated` tanpa sesi aktif memastikan keempat
  RPC menolak akses dengan `42501 ACCESS_DENIED`. Transaksi pengujian diakhiri
  dengan rollback. Permintaan HTTP anonim ke `complaints_overview` dan
  `submit_complaint` juga menghasilkan HTTP `401`, kode `42501`, bukan kesalahan
  RPC tidak ditemukan.
- Kedua tabel pengaduan masih kosong. Tidak ada akun, identitas, atau pengaduan
  dummy yang ditambahkan. Jumlah profil dan invoice iuran tetap masing-masing
  dua sebelum dan sesudah penerapan. Isi awal editor SQL dikembalikan setelah
  verifikasi.
- Tabel `supabase_migrations.schema_migrations` belum ada; riwayat CLI belum
  disinkronkan. Deployment hosting frontend tidak dilakukan. Pengujian alur
  pengaduan cloud dengan sesi warga/pengelola nyata dan konkurensi dua koneksi
  masih perlu dilakukan; pemeriksaan skema/akses di atas bukan pengganti uji itu.

## Route dan alur

| Route                     | Perilaku                                        |
| ------------------------- | ----------------------------------------------- |
| `/warga/pengaduan`        | Daftar pengaduan sendiri.                       |
| `/warga/pengaduan/tambah` | Dialog pengajuan pribadi.                       |
| `/warga/pengaduan/:id`    | Detail, hasil penanganan, dan riwayat sendiri.  |
| `/admin/pengaduan`        | Daftar seluruh pengaduan dan empat kartu rekap. |
| `/admin/pengaduan/:id`    | Detail dan tindakan penanganan pengelola.       |

Sidebar mengikuti peran. Tautan Pengaduan saya dan Kelola seluruh pengaduan warga
menghubungkan cakupan pribadi dan pengelolaan. Pengelola yang membuka route
pribadi hanya melihat pengaduannya sendiri pada route tersebut.

Formulir hanya menampilkan judul, kategori, dan deskripsi, tanpa nama pengaju
atau nomor rumah. Judul, deskripsi, dan kategori wajib. Judul maksimal
200 karakter, deskripsi dan catatan maksimal 2.000 karakter. Pilihan kategori tetap Fasilitas Umum, Keamanan,
serta Kebersihan dan Sampah. Pemilik ditetapkan dari sesi; nama
disalin server saat pengajuan. NIK, KK, dan alamat tidak disalin ke pengaduan.
Pengaduan terkirim tidak dapat diedit, dibatalkan, atau dihapus oleh warga.

| Status                 | Tindakan                                               | Hasil    |
| ---------------------- | ------------------------------------------------------ | -------- |
| Diajukan               | Mulai Proses; catatan opsional.                        | Diproses |
| Diajukan atau Diproses | Tolak Pengaduan; alasan wajib dan konfirmasi berjudul. | Ditolak  |
| Diproses               | Selesaikan; catatan hasil wajib.                       | Selesai  |

Selesai dan Ditolak adalah status akhir. Kategori dapat diperbaiki sebelum status
akhir, melalui Simpan kategori atau bersamaan dengan perubahan status. Koreksi
kategori menyimpan riwayat kategori sebelum/sesudah dan tidak menambahkan catatan.
Tidak tersedia catatan berkala tanpa perubahan status. Seluruh riwayat dapat
dibaca pengaju, termasuk penjelasan penolakan dan hasil penanganan.

Pencarian meliputi judul dan nomor `ADU-…`; pengelola juga dapat mencari nama
pengaju. Filter kategori, status, rentang tanggal pengajuan, urutan, dan halaman
disimpan pada URL. Tanggal awal/akhir mencakup seluruh hari WIB: awal inklusif,
akhir sebelum pukul 00.00 hari berikutnya. Tanggal awal setelah akhir ditolak.
Pagination empat baris, urutan waktu dengan ID sebagai pembeda jika waktu sama.
Empat kartu Diajukan/Diproses/Selesai/Ditolak menghitung seluruh hasil filter
sebelum pagination; total tersedia pada tabel. Kartu bersifat informatif.

## Kontrak dan otorisasi

- `complaints_overview(p_scope, p_search, p_category, p_status, p_from, p_to,
p_sort, p_page)` mengembalikan `{items,total,summary}`. `mine` mengikuti sesi;
  `all` memerlukan pengelola aktif. `summary` hanya tersedia untuk `all`, selain
  itu bernilai `null`. Kategori/status tanpa filter menggunakan `all`;
  tanggal tanpa batas menggunakan `null`; urutan `newest` atau `oldest`.
- `complaint_detail(p_id, p_scope)` mengembalikan `{complaint,events}`. Cakupan
  default `mine`. Riwayat berurutan waktu dan ID. Objek yang tidak dapat diakses
  memberikan pesan yang sama dengan objek yang tidak ditemukan.
- `submit_complaint(p_request_id, p_title, p_description, p_category)`
  mengembalikan pengaduan. UUID dibuat sekali per formulir dan digunakan kembali
  ketika mencoba ulang. Advisory lock dan payload tersimpan menjamin pengiriman
  identik menghasilkan satu pengaduan/event awal. Payload/pemilik berbeda dengan
  UUID sama ditolak, termasuk setelah kategori/status pengaduan berubah.
- `review_complaint(p_id, p_action, p_category, p_note, p_expected_updated_at)`
  mengembalikan detail. Tindakan `start`, `complete`, `reject`, atau `recategorize`.
  Kategori `null` mempertahankan kategori terkini. Catatan selalu string;
  `recategorize` harus kosong. Pemeriksaan pengelola, penguncian baris, validasi
  versi dan transisi, penyimpanan hasil serta riwayat terjadi dalam satu transaksi.
  Versi basi menghasilkan `40001`, tanpa event tambahan.

Tabel `complaints` dan `complaint_events` menggunakan RLS dan hanya memberikan
SELECT kepada browser yang terautentikasi. Seluruh penulisan melalui RPC;
fungsi privat tidak dapat dipakai untuk menulis dari browser. Sesi Auth harus
masih ada, akun aktif/nonarsip, dan pembaca merupakan pemilik atau pengelola.
Sesama KK tidak memiliki akses tambahan. Riwayat menyimpan nama dan jabatan
pelaku saat tindakan, bukan hanya merujuk profil yang dapat berubah.

Query memakai TanStack Query dengan cakupan sesi/peran dari provider bersama,
serta pemilik dan cakupan pada query key. Data dibaca ulang setelah mutasi,
ketika jendela mendapat fokus, dan melalui Coba lagi. Konflik versi memerlukan
Muat ulang detail. Input tetap tersedia jika pengiriman atau penanganan gagal;
keberhasilan hanya ditampilkan setelah RPC selesai.

## Desain dan aksesibilitas

`design.fig` belum memuat layar khusus pengaduan. Susunan mengadaptasi daftar
surat `0:4901`, formulir `0:3965`, dan detail `0:5080`, dibaca melalui OpenPencil.
Gunakan sidebar/header, PageIntro, SummaryCardView, TablePagination, TextInput,
Inter, Lucide, serta token yang sudah tersedia. Tidak ada perubahan file desain.

Formulir maksimal 1000 px dan detail 912 px, radius 22 px, padding desktop 28 px,
gap field 16 px, kontrol minimum 48 px. Di bawah 640 px formulir satu kolom.
Tabel bergulir dalam region sendiri. Dialog native menahan fokus; Escape menutup
dialog teratas dan fokus kembali ke pemicu. Saat mutasi berlangsung dialog tidak
dapat ditutup. Kesalahan terhubung ke kontrol; pengiriman invalid memfokuskan
kontrol bermasalah. Status selalu memiliki label teks.

## Validasi dan batas pengujian

Jalankan `npm run build`, `npm run typecheck`, `npm run lint`, pemeriksaan Prettier
berkas terkait, `npm test`, dan `npm run test:e2e`. Pengujian database memakai
migrasi asli berurutan di PGlite. Playwright menggunakan respons Supabase tiruan,
akun/identitas dummy, serta screenshot di `test-results/` yang diabaikan Git.

Skenario mencakup pengajuan belum terverifikasi, input invalid, tiga kategori,
duplikasi, salinan identitas, kesetaraan kedua pengelola, seluruh transisi,
penolakan, hasil wajib, koreksi kategori, riwayat, rollback, versi basi, filter,
rekap, pagination, batas tanggal WIB, dan akses lintas warga/KK. Pengujian browser
juga mencakup kegagalan jaringan, input tetap tersedia, pemulihan, keyboard,
fokus dialog, navigasi mobile, dan lebar 360/375/768/1280/1648 px.

PGlite tidak membuktikan konkurensi dua koneksi PostgreSQL atau integrasi layanan
Supabase HTTP sesungguhnya. Sebelum demo, jalankan smoke test dengan dua akun warga
dummy sesama KK serta kedua pengelola pada Supabase: kirim, proses, selesaikan/tolak,
ubah kategori, coba akses silang, ulangi pengiriman, dan ubah bersamaan dari dua
sesi. Catat hasil aktual beserta bukti; pengujian layanan nyata belum diklaim.

Validasi implementasi pada 4 November 2026: build, typecheck, lint, pemeriksaan
format berkas terkait, dan linter DESIGN.md lulus tanpa error/peringatan. Seluruh
56 pengujian Node/database dan 83 pengujian browser lulus, termasuk 9 skenario
database dan 10 skenario browser khusus pengaduan. Screenshot daftar, formulir,
dan detail pada lima lebar yang disebutkan di atas telah diperiksa; pemeriksaan
visual manual mencakup daftar/formulir desktop dan detail ponsel. Pengujian browser
tetap menggunakan respons Supabase tiruan, bukan layanan cloud.

Notifikasi pengaduan NOT-01–NOT-03, ekspor CSV RPT-04, dashboard global, lampiran,
dan percakapan tidak termasuk tahap ini. Status/hasil tetap tersedia melalui
halaman detail tanpa ketergantungan pada pusat notifikasi.
