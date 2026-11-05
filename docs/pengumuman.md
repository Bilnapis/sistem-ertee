# Pengumuman terjadwal

Ketua RT dan Pengurus RT memiliki kewenangan sama untuk membuat, mengedit,
mengarsipkan dan menayangkan ulang seluruh pengumuman. Tidak ada draf, penghapusan
permanen atau persetujuan tambahan. Semua akun aktif nonarsip, termasuk profil
belum lengkap/terverifikasi, membaca pengumuman yang sedang tayang setelah login.

## Perilaku dan route

Judul wajib, maksimal 200 karakter; deskripsi wajib, maksimal 2.000 karakter.
Deskripsi ditampilkan sebagai teks biasa dengan baris baru. Jadwal diinput dalam
WIB secara eksplisit, dikonversi dengan offset +07:00, lalu disimpan sebagai
`timestamptz`. Zona waktu browser tidak mengubah makna input.

Waktu mulai inklusif dan selesai eksklusif: `starts_at <= now < ends_at`.
Arsip mengesampingkan jadwal. Waktu selesai wajib setelah mulai; pembuatan dan
tayangkan ulang juga mensyaratkan selesai masih di masa depan. Awal yang sudah
lewat diperbolehkan untuk tayang langsung. Pengumuman selesai tidak otomatis
diarsipkan dan dapat dikoreksi atau dijadwalkan ulang. Pengumuman arsip hanya
diperbarui melalui Tayangkan ulang, yang menyimpan isi, jadwal dan pelepasan arsip
dalam transaksi yang sama.

| Route                                   | Perilaku                                                              |
| --------------------------------------- | --------------------------------------------------------------------- |
| `/admin/pengumuman`                     | Tabel, pencarian judul, filter empat status, empat baris per halaman. |
| `/admin/pengumuman/tambah`              | Dialog pembuatan langsung terjadwal.                                  |
| `/admin/pengumuman/:id`                 | Detail admin dan konfirmasi arsip yang menyebut judul.                |
| `/admin/pengumuman/:id/edit`            | Edit data nonarsip.                                                   |
| `/admin/pengumuman/:id/tayangkan-ulang` | Memeriksa isi/jadwal arsip sebelum mengaktifkan kembali.              |
| `/warga/pengumuman`                     | Semua role: kartu aktif, pencarian judul, empat per halaman.          |
| `/warga/pengumuman/:id`                 | Detail yang hanya tersedia selama tayang.                             |

Beranda `/warga` menampilkan tiga pengumuman aktif terbaru di atas profil dan
tautan Lihat semua. `/warga/profil` tetap hanya profil. Urutan adalah waktu mulai
menurun lalu ID menaik. Pencarian, filter admin dan halaman disimpan di URL;
perubahan filter mengembalikan halaman ke awal. Halaman yang melebihi hasil
dikembalikan ke halaman pertama.

## Database dan API

Migrasi `20261105000100_announcements.sql` menambah tabel `announcements`, RLS,
dua helper privat, dan lima RPC. Migrasi tambahan
`20261105000200_announcement_conflicts.sql` memperbaiki respons konflik versi
menjadi HTTP 409. Tidak ada job cron, bucket, Edge Function, seed,
dependensi atau variabel lingkungan tambahan.

- `announcements_overview(p_scope,p_search,p_status,p_page,p_page_size)` mengembalikan
  `{items,total,server_now,next_change_at}`. Cakupan `active` hanya berisi tayangan
  saat ini untuk semua role; `manage` memerlukan pengelola. Status menggunakan
  `all`, `scheduled`, `active`, `ended`, atau `archived`. Ukuran halaman 3 untuk
  Beranda atau 4 untuk daftar. Pencarian judul mengabaikan kapitalisasi.
- `announcement_detail(p_id,p_scope)` mengembalikan
  `{announcement,server_now,next_change_at}`. Cakupan pembaca tetap membatasi
  pengelola pada tayangan aktif. Data tidak ditemukan/tidak dapat dibaca memakai
  kode `P0002`, termasuk setelah waktu akhir.
- `create_announcement(p_request_id,p_title,p_description,p_starts_at,p_ends_at)`
  menggunakan UUID formulir tetap saat mencoba ulang. Advisory lock dan payload
  awal memastikan satu record. Pengulangan dengan pemilik/payload awal sama
  mengembalikan record terkini, termasuk setelah record diedit; pemilik/payload
  berbeda ditolak. Payload awal tidak dapat dibaca melalui RPC maupun kolom REST.
- `update_announcement(p_id,p_title,p_description,p_starts_at,p_ends_at,
p_expected_updated_at,p_republish)` menangani edit (`false`) atau tayangkan
  ulang (`true`). Tindakan wajib sesuai status arsip. `created_by` tetap;
  `updated_by` dan waktu perubahan ditetapkan dari sesi/server.
- `archive_announcement(p_id,p_expected_updated_at)` menyimpan waktu arsip dan
  pengubah. Seluruh perubahan memeriksa versi dan mengunci baris. Versi basi
  menghasilkan `PT409` (HTTP 409) tanpa mengubah data. Frontend juga mengenali
  `40001` untuk kompatibilitas instalasi lama.

RLS menolak pembacaan akun nonaktif, arsip dan sesi Auth yang dicabut. Warga hanya
dapat SELECT kolom yang diizinkan pada pengumuman aktif; tidak memiliki hak tulis
langsung. Pengelola aktif dapat membaca semua status. RPC pembacaan cakupan aktif
tetap memeriksa jadwal meskipun pemanggil pengelola. Semua fungsi memakai
`search_path` kosong, dan RPC tidak dapat dieksekusi role `anon`.

## Pembaruan tampilan dan aksesibilitas

TanStack Query memakai provider sesi/peran yang sudah tersedia. Cache daftar,
detail dan Beranda dibaca ulang setelah mutasi, saat fokus dan setiap 60 detik.
Timer dari waktu server dan batas jadwal berikutnya memicu pembacaan ulang saat
awal/akhir. Batas berikutnya hanya timestamp, tanpa isi atau ID tayangan tersembunyi.

Waktu server ditambatkan pada `performance.now()` sebelum permintaan, sehingga
jam lokal yang salah tidak memperpanjang tayangan. Latensi dapat menyembunyikan
tayangan sedikit lebih awal. Pembacaan ulang yang gagal tidak mempertahankan
konten kedaluwarsa. Fokus/visibility memperbarui estimasi setelah tab kembali.
Perubahan isi/jadwal/arsip dari sesi admin lain terdeteksi melalui polling paling
lama sekitar 60 detik saat tab aktif, atau saat kembali ke tab.

Keadaan memuat/kosong/gagal tersedia; Coba lagi mempertahankan profil Beranda.
Masukan formulir tetap ada setelah gagal simpan. Konflik versi memblokir simpan;
Muat ulang data dan formulir secara eksplisit mengganti masukan dengan data terbaru.
Polling tidak mengganti dasar versi formulir yang sedang diedit secara diam-diam.

Pola native dialog menahan fokus, Escape menutup dialog teratas dan fokus kembali
ke pemicu. Dialog tidak dapat ditutup saat penyimpanan. Error terhubung ke field,
dan validasi memfokuskan field invalid pertama. Tabel bergulir dalam region sendiri;
formulir satu kolom pada ponsel. Gaya mengikuti DESIGN.md dan komponen bersama.

## Pemasangan

1. Pastikan lima migrasi sebelumnya sudah diterapkan dan tabel `announcements`
   belum tersedia. Jangan mereset database yang berisi data.
2. Supabase lokal yang sudah berjalan: jalankan `supabase migration up` dengan
   CLI yang terpasang. Inisialisasi lokal baru menerapkan semua migrasi berurutan.
3. Untuk cloud melalui SQL Editor, jalankan seluruh isi
   `supabase/migrations/20261105000100_announcements.sql` lalu
   `supabase/migrations/20261105000200_announcement_conflicts.sql` masing-masing
   satu kali pada proyek yang sesuai konfigurasi frontend. Kedua berkas
   membungkus perubahan dalam transaksi.
4. Jika memakai CLI cloud, periksa link proyek dan riwayat migrasi dahulu. Proyek
   ini sebelumnya memakai SQL Editor; jangan langsung menjalankan `db push`
   dengan riwayat kosong. Sinkronkan riwayat hanya untuk migrasi yang skemanya
   benar-benar sudah terpasang sebelum menerapkan tambahan. Pada CLI v3, gunakan
   `--remote` untuk target cloud; tanpa flag itu perintah database/migrasi
   mengarah ke stack lokal.
5. Verifikasi tabel, RLS, satu kebijakan SELECT, lima RPC, hak kolom SELECT dan
   larangan INSERT/UPDATE/DELETE bagi `authenticated`. Pastikan `anon` tidak dapat
   memanggil RPC. Pasang frontend setelah kontrak database tersedia.

### Penerapan cloud — 5 November 2026

Setelah pengguna menyiapkan login CLI, proyek tertaut **Sistem ErTee**
(`vzdkaqvrzsjrmnsbbkaz`) diverifikasi sesuai URL frontend. Audit baca saja
membandingkan skema cloud dengan lima migrasi sebelumnya di PGlite: 12 tabel,
132 kolom, 33 indeks, 16 kebijakan, 8 trigger, 44 fungsi dan 83 constraint
PostgreSQL 17 cocok. Perbedaan representasi constraint NOT NULL
pada PGlite diperiksa melalui atribut kolom; cast email pada trigger mengikuti
tipe kolom Auth cloud.

Riwayat CLI semula kosong karena pemasangan lama memakai SQL Editor. Lima versi
lama ditandai `applied` setelah audit tersebut. Dry run kemudian hanya memuat
`20261105000100_announcements.sql`; migrasi itu berhasil diterapkan dengan
`db push --remote=vzdkaqvrzsjrmnsbbkaz --skip-vault --yes`. Migrasi koreksi
`20261105000200_announcement_conflicts.sql` kemudian juga diterapkan setelah
uji cloud mengungkap masalah konflik versi. Ketujuh versi sekarang sinkron. Migrasi lama, seed, role tambahan dan Vault tidak dijalankan ulang.

Verifikasi sesudah migrasi memastikan tabel tersedia dengan RLS aktif, satu
kebijakan SELECT, lima RPC, hak baca kolom judul, serta larangan tulis langsung
dan pembacaan `submitted_payload` bagi `authenticated`. Sebelum smoke test,
tabel pengumuman kosong dan dua profil lama tetap tersedia. Konfigurasi SMTP
lokal diganti dari `[inbucket]` menjadi `[local_smtp]` sesuai CLI v3; tidak ada
perubahan hosting frontend.

### Koreksi konflik versi saat uji cloud

Pada pengujian HTTP nyata, edit dengan versi terbaru berhasil, tetapi permintaan
versi basi menggunakan SQLSTATE `40001` mengalami timeout. Pemeriksaan aktivitas
PostgreSQL tidak menunjukkan blocker baris; permintaan konflik masuk transaksi
aborted. Kode kelas `40*` dipetakan menjadi HTTP 500, sedangkan `PT409` secara
eksplisit menghasilkan HTTP 409 sesuai
[dokumentasi PostgREST](https://docs.postgrest.org/en/stable/references/errors.html).
Pemakaian kode transaksi untuk konflik aplikasi diganti melalui migrasi tambahan;
berkas migrasi yang sudah diterapkan tetap utuh. Kedua RPC edit/arsip serta
penanganan konflik formulir/detail dan respons mock telah disesuaikan. Sepuluh
uji database, 17 uji browser pengumuman, build dan lint lulus setelah koreksi.

## Pengujian dan smoke test

Pengujian database menjalankan seluruh migrasi asli berurutan di PGlite. Pengujian
browser memakai respons Supabase tiruan. Jalankan:

```sh
npm run build
npm run lint
npm test
npm run test:e2e
```

Cakupan meliputi batas waktu persis, WIB, RLS/privilege, profil belum terverifikasi,
kedua pengelola, create/edit/arsip/tayangkan ulang, validasi, payload percobaan ulang,
konflik versi, pencarian/filter/pagination, tiga kartu Beranda, profil terpisah,
kegagalan/pemulihan, timer, polling, jam browser salah, keyboard, dan lebar 375/1280 px.
Screenshot berada di `test-results/` yang diabaikan Git. PGlite tidak membuktikan
konkurensi dua koneksi PostgreSQL; mock HTTP bukan verifikasi layanan cloud.

Setelah pemasangan, gunakan akun dummy terpisah untuk Ketua RT, Pengurus RT dan
warga belum terverifikasi. Buat jadwal singkat; periksa tiga kartu dan daftar/detail
sebelum/saat/setelah tayang tanpa reload. Coba edit lintas admin, arsip, tayangkan
ulang, pengiriman ulang, akses URL/REST tersembunyi, dan edit bersamaan dari dua sesi.
Pastikan satu edit berhasil dan lainnya mendapat konflik versi. Catat waktu, hasil
serta bukti aktual. Bersihkan data dummy melalui pengarsipan, tanpa menghapus data lain.

Notifikasi NOT-01, lampiran, komentar dan penanda sudah dibaca belum termasuk fitur ini.

Validasi lokal pada 5 November 2026: build (termasuk TypeScript), lint, format
berkas terkait dan linter DESIGN.md lulus; linter desain melaporkan nol error
dan warning. Seluruh 66 pengujian Node/database serta 100 pengujian browser
lulus, termasuk 10 skenario database dan 17 skenario browser khusus pengumuman.
Screenshot daftar admin, daftar pembaca dan formulir pada 375/1280 px dibuat;
pemeriksaan visual manual mencakup daftar pembaca desktop serta daftar admin
dan formulir ponsel. Hasil lokal ini menggunakan respons API tiruan; pengujian
layanan nyata dilakukan terpisah sebagaimana catatan berikut.

### Hasil smoke test cloud

Putaran akhir lulus pada **5 November 2026 pukul 11.15–11.16 WIB**, menggunakan
Supabase Auth/REST/RPC sesungguhnya dan browser Chrome yang menjalankan frontend
lokal dengan backend cloud. Sembilan kelompok pemeriksaan lulus:

1. Login akun dummy Ketua RT, Pengurus RT dan warga belum terverifikasi menghasilkan
   sesi Auth nyata; role pengelola berasal dari profil database.
2. Pembuatan pengumuman dan pengulangan UUID identik menghasilkan satu data;
   payload awal tidak bocor ke pembaca.
3. Semua role membaca daftar/detail pengumuman aktif melalui HTTP.
4. Pengumuman mendatang tersembunyi pada daftar, detail dan SELECT REST pembaca;
   cakupan pengelolaan, pembuatan oleh warga, PATCH langsung dan RPC anonim ditolak.
5. Edit lintas admin berhasil. Versi basi mengembalikan HTTP 409/`PT409` segera.
   Dua permintaan edit paralel dari sesi Ketua RT/Pengurus RT menghasilkan tepat
   satu keberhasilan dan satu konflik, tanpa menimpa perubahan pemenang.
6. Browser mengedit isi, mengonfirmasi arsip dengan judul, memastikan warga kehilangan
   akses, lalu menayangkan ulang dari formulir berisi data lama.
7. Warga belum terverifikasi melihat pengumuman di atas profil dan pada daftar;
   halaman berfungsi pada 375/1280 px dengan zona browser America/New_York dan
   jadwal tetap ditampilkan dalam WIB.
8. Jadwal singkat mulai dan berakhir pada browser terbuka tanpa reload; setelah
   selesai, detail dan SELECT REST juga menolak akses terhadap data tersebut.
9. Logout mencabut akses JWT lama; akun yang dinonaktifkan/diarsipkan juga ditolak.

Akun Auth dummy serta seluruh pengumuman, profil, invoice iuran otomatis dan
riwayat yang dibuat khusus oleh pengujian dibersihkan, termasuk putaran diagnosis
sebelumnya. Pembersihan dibatasi ID/email/tag unik milik pengujian, dengan penjaga
agar berhenti jika ada aktivitas lain pada akun tersebut. Verifikasi akhir
menemukan **0 akun Auth uji tersisa dan 0 pengumuman**, sementara profil dan invoice
kembali masing-masing **2**, sama seperti sebelum pengujian. Jumlah surat,
pengaduan, riwayat dan transaksi kas lama juga tetap sama.

Dry run akhir melaporkan database remote sudah mutakhir tanpa migrasi tertunda;
ketujuh versi lokal/cloud sinkron. RLS, satu kebijakan SELECT, hak EXECUTE kelima
RPC bagi authenticated, larangan EXECUTE bagi anon, larangan tulis langsung dan
larangan membaca payload awal diverifikasi ulang setelah koreksi. Screenshot
backend nyata berada di `test-results/announcements-cloud-home-375.png` dan
`test-results/announcements-cloud-home-1280.png`; tampilan ponsel diperiksa manual.
Hosting frontend belum dideploy ulang.
