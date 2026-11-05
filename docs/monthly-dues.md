# Iuran warga bulanan

Satu tagihan per profil aktif nonarsip setiap bulan, termasuk profil pengurus.
Verifikasi identitas bukan syarat pembayaran. Akun lama mulai ditagih pada bulan
migrasi fitur diterapkan; akun baru mulai pada bulan aktif dengan tarif penuh.
Tidak ada prorata, cicilan, denda, tagihan sebelum fitur aktif, atau pembayaran
daring. Warga baru setelah tanggal 10 tetap mendapat jatuh tempo bulan itu.
Akun nonaktif/arsip tidak mendapat tagihan baru; catatan sebelumnya tetap tersimpan.

## Pemasangan dan konfigurasi Supabase

### Proyek dan urutan migrasi

Proyek cloud yang digunakan adalah **Sistem ErTee** (`vzdkaqvrzsjrmnsbbkaz`),
sesuai `VITE_SUPABASE_URL` di `.env.local`. Pastikan nama proyek dan project ref
pada dashboard cocok sebelum menjalankan SQL. Gunakan SQL Editor dengan role
`postgres`/pemilik database, bukan sesi warga atau publishable key.

Urutan migrasi untuk **database baru**:

1. `supabase/migrations/20261102000100_resident_auth.sql`
2. `supabase/migrations/20261103000100_resident_management.sql`
3. `supabase/migrations/20261104000100_letter_requests.sql`
4. `supabase/migrations/20261104000200_monthly_dues.sql`

Jalankan seluruh isi setiap berkas sekali sesuai urutan. Migrasi iuran memakai
transaksi `begin`/`commit`; jangan memotong atau mengganti isinya. Migrasi
menginisialisasi tarif Rp50.000, jatuh tempo tanggal 10, rekening kosong,
bucket privat `dues-proofs`, dan tagihan bulan berjalan untuk profil aktif.
Keenam tabel iuran mengaktifkan RLS melalui blok SQL dinamis di dalam migrasi;
jangan menambahkan policy publik atau mematikan RLS.

**Pada proyek cloud di atas, keempat migrasi sudah diterapkan. Jangan jalankan
ulang migrasi CREATE TABLE.** Pemeriksaan sebelum pemasangan pada 4 November
2026 memastikan skema autentikasi, warga, dan surat sudah tersedia, sehingga
hanya migrasi iuran yang diterapkan pada pekerjaan ini.

Penerapan dilakukan melalui SQL Editor; tabel
`supabase_migrations.schema_migrations` belum tersedia saat pemeriksaan awal.
Dengan demikian, penerapan ini **tidak menyinkronkan riwayat migrasi CLI**.
Sebelum menggunakan `supabase db push` berikutnya, login, hubungkan CLI ke
project ref yang tepat, lalu periksa dan tandai keempat versi yang benar-benar
sudah diterapkan. Contoh alur **untuk sinkronisasi riwayat di kemudian hari**
(perintah ini belum dijalankan pada pemasangan ini):

```sh
npx supabase login
npx supabase link --project-ref vzdkaqvrzsjrmnsbbkaz
npx supabase migration list --linked

# Hanya setelah memastikan empat migrasi berikut sudah ada pada cloud:
npx supabase migration repair \
  20261102000100 20261103000100 20261104000100 20261104000200 \
  --status applied --linked
npx supabase migration list --linked
```

`migration repair` menandai riwayat, bukan menjalankan SQL migrasi. Ikuti juga
panduan `docs/resident-management.md`; jangan mengirim migrasi lama atau
melakukan reset database cloud untuk memperbaiki riwayat.

Frontend tetap memakai URL dan publishable/anon key yang sama. Fitur iuran tidak
memerlukan Edge Function, service-role key di browser, atau variabel `VITE_*`
baru. Tidak ada konfigurasi rahasia frontend yang diubah pada pemasangan ini.

### Memasang job otomatis

Setelah migrasi inti, jalankan seluruh isi `supabase/cron/monthly-dues.sql`
sebagai pemilik database melalui SQL Editor, dengan isi:

```sql
create extension if not exists pg_cron;
select cron.schedule(
  'ertee-monthly-dues',
  '0 17 * * *',
  $$select app_private.generate_monthly_dues();$$
);
```

Job ini berjalan **setiap hari pukul 17.00 UTC/GMT = pukul 00.00 WIB**,
bukan setiap tanggal 17. Zona waktu scheduler cloud telah dibaca ulang sebagai
`GMT`; fungsi menentukan periode tagihan menggunakan `Asia/Jakarta`.
Job harian memastikan tagihan bulan berjalan tersedia. Pemanggilan berulang aman
karena kombinasi warga/periode unik. Menjalankan ulang skrip Cron memperbarui job
dengan nama yang sama, bukan membuat job kedua; job lain tidak diubah.

Scheduler sengaja berada di luar migrasi inti agar pengujian PostgreSQL/WASM
tidak memerlukan extension Cron. Tagihan juga dipastikan tersedia saat profil
menjadi aktif dan saat daftar dibuka. Pemulihan ini hanya membuat bulan berjalan;
job yang terhenti sepanjang satu bulan perlu diperiksa oleh operator, tanpa
otomatis membebankan periode lampau yang belum pernah diterbitkan.

Periksa konfigurasi dan riwayat dari SQL Editor:

```sql
select extversion from pg_extension where extname = 'pg_cron';
select current_setting('cron.timezone', true) as scheduler_timezone;

select jobid, jobname, schedule, command, database, username, active
from cron.job
where jobname = 'ertee-monthly-dues';

select r.runid, r.status, r.return_message, r.start_time, r.end_time
from cron.job_run_details r
join cron.job j using (jobid)
where j.jobname = 'ertee-monthly-dues'
order by r.runid desc
limit 10;
```

Hasil yang diharapkan: tepat satu job, `active = true`, jadwal `0 17 * * *`,
perintah `select app_private.generate_monthly_dues();`, database dan pengguna
`postgres`. Riwayat menunjukkan `succeeded` setelah job benar-benar dijalankan;
hanya keberadaan job belum membuktikan scheduler bekerja.

Untuk memeriksa idempotensi pada bulan berjalan, bandingkan jumlah tagihan
sebelum dan sesudah dua pemanggilan fungsi:

```sql
select period, count(*) from public.dues_invoices group by period;
select app_private.generate_monthly_dues();
select app_private.generate_monthly_dues();
select period, count(*) from public.dues_invoices group by period;

-- Hasil harus kosong: tidak boleh ada warga/periode ganda.
select resident_id, period, count(*)
from public.dues_invoices
group by resident_id, period
having count(*) > 1;
```

Jika ada profil aktif yang belum ditagih, pemanggilan pertama dapat menambah
baris yang memang hilang. Pemanggilan kedua tidak boleh menggandakannya.
Jangan memberikan waktu masa depan untuk pengujian pada database cloud.

### Rekening penerima dan tarif

Masuk sebagai Ketua RT/Pengurus RT, buka **Iuran Warga → Pengaturan iuran**
(`/admin/iuran-warga/pengaturan`). Isi nama bank, nomor rekening 5–50 digit,
dan atas nama untuk mengaktifkan Transfer. Kosongkan ketiganya untuk
menonaktifkan Transfer. Tunai tetap tersedia. Tarif dan tanggal jatuh tempo
baru berlaku bulan berikutnya; rekening berlaku segera untuk konfirmasi baru.

**Rekening belum diisi**, karena pemilik belum memberikan rekening penerima.
Pemasangan mempertahankan keadaan tersebut; tidak ada nomor rekening contoh
yang digunakan. Metode Transfer belum dapat dipakai sampai pengurus mengisinya.

### Hasil penerapan cloud — 4 November 2026

- Migrasi `20261104000200_monthly_dues.sql` diterapkan dari berkas lokal utuh
  melalui SQL Editor pada proyek `vzdkaqvrzsjrmnsbbkaz`.
- Pembacaan ulang memverifikasi **6 tabel dengan RLS aktif**, 6 RPC publik,
  trigger aktivasi profil, serta dua policy Storage untuk INSERT dan SELECT.
  Keenam RPC tidak memberi hak EXECUTE kepada `anon`; `authenticated` diizinkan
  memanggilnya dengan pemeriksaan sesi/role di dalam fungsi.
- Bucket `dues-proofs` terverifikasi **privat**, batas **5.242.880 byte (5 MiB)**,
  dengan MIME `image/jpeg`, `image/png`, dan `application/pdf`.
- **2 profil aktif** mendapat **2 tagihan periode November 2026**, masing-masing
  **Rp50.000**, jatuh tempo **10 November 2026**, status `belum_bayar`.
  Tidak ada profil aktif yang kehilangan tagihan atau kombinasi warga/periode
  ganda. Dua pemanggilan manual generator mempertahankan jumlah 2 tagihan.
- Extension `pg_cron` **1.6.4** aktif. Job `ertee-monthly-dues`, **jobid 1**,
  terverifikasi aktif, pengguna/database `postgres`, jadwal akhir `0 17 * * *`.
- Scheduler nyata diuji dengan mengubah sementara job yang sama menjadi
  interval **10 detik**. `cron.job_run_details` mencatat **runid 1 dan 2**
  `succeeded`, masing-masing mulai **19.35.35 dan 19.35.45 WIB** pada
  4 November 2026. Jadwal harian kemudian dipulihkan menggunakan skrip Cron
  asli dan dibaca ulang; hanya satu job tersisa. Interval pengujian bukan
  konfigurasi yang ditinggalkan.
- Setelah pengujian, jumlah tagihan tetap **2**, pembayaran **0**, dan
  pemasukan kas **0**. Tidak ada pembayaran, akun, rekening, atau unggahan
  bukti dummy yang ditambahkan. `npm test` juga dijalankan ulang: **47/47 lulus**.
- Penerapan ini mencakup database, Storage policy, dan Cron cloud; tidak
  mencakup deployment hosting, sinkronisasi riwayat CLI, pengisian rekening,
  maupun uji pembayaran/Storage HTTP lintas akun.

## Route dan penggunaan

| Route                           | Perilaku                                                           |
| ------------------------------- | ------------------------------------------------------------------ |
| `/warga/iuran-warga`            | Ringkasan bulan ini, tagihan, riwayat pribadi dan filter.          |
| `/warga/iuran-warga/:id`        | Detail, konfirmasi sebelumnya, bukti privat dan riwayat.           |
| `/warga/iuran-warga/:id/bayar`  | Konfirmasi Tunai/Cash atau Transfer.                               |
| `/admin/iuran-warga`            | Seluruh tagihan, ringkasan periode dan filter warga/status/metode. |
| `/admin/iuran-warga/:id`        | Sahkan, tolak, batalkan pembayaran dan unduh bukti.                |
| `/admin/iuran-warga/pengaturan` | Tarif/jatuh tempo periode berikutnya dan rekening penerima.        |

Daftar memakai 10 baris per halaman, urutan bulan terbaru lalu waktu penerbitan
dan ID. Filter URL: `bulan=YYYY-MM`, `status`, `metode`, `cari`, `halaman`.
Default daftar pengurus adalah bulan berjalan, warga seluruh bulan pribadi.
Ringkasan pengurus mengikuti bulan, terlepas dari pencarian/status/metode.

Warga mengonfirmasi setelah membayar: Tunai/Cash tanpa lampiran, Transfer wajib
satu JPG/PNG/PDF dengan ukuran lebih dari 0 dan maksimal 5 MiB. Tanggal pembayaran
wajib, tidak boleh di masa depan; catatan maksimal 2.000 karakter. Pembayaran
selalu sejumlah tagihan, tanpa mengirim nominal atau pemilik dari browser.

Alur: **Belum Bayar → Menunggu Verifikasi → Lunas**. Pengurus harus memastikan
uang tunai diterima atau transfer masuk sebelum mengesahkan. Penolakan wajib
alasan, mengembalikan tagihan menjadi Belum Bayar; warga dapat mengirim konfirmasi
baru. Konfirmasi terkirim tidak dapat diedit. Pembatalan pembayaran sah memerlukan
alasan dan konfirmasi tambahan; tagihan dapat dibayar ulang, seluruh catatan lama
tetap ada. Ketua RT dan Pengurus RT memiliki kewenangan sama.

## Kontrak, integritas, dan privasi

- `dues_overview(p_scope,p_period,p_status,p_method,p_search,p_page)` mengembalikan
  tagihan bulan ini, `{items,total}`, ringkasan, periode WIB server dan konfigurasi.
  Scope `mine` selalu mengikuti sesi; `all` khusus pengurus. Pencarian literal
  nama dan nomor rumah. `dues_detail(p_id)` mengembalikan invoice, payments, events.
- `submit_dues_payment(p_request_id,p_invoice_id,p_method,p_payment_date,p_notes,
p_attachment)` memakai UUID tetap per formulir. Pengiriman identik mengembalikan
  hasil sebelumnya; UUID sama dengan payload berbeda ditolak. Lock UUID dan
  tagihan serta index unik mencegah dua konfirmasi menunggu/sah sekaligus.
- `review_dues_payment(p_payment_id,p_action,p_note,p_expected_updated_at)` hanya
  menerima persetujuan/penolakan dari Diajukan, dan pembatalan dari Disetujui.
  Versi usang ditolak. Pengulangan tindakan yang sudah berhasil tidak menambah
  kas atau riwayat. Riwayat mencatat pelaku, jabatan, waktu dan alasan.
- Persetujuan dan satu pemasukan kas tertaut disimpan atomik. Pembatalan sekaligus
  membatalkan pemasukan itu. Rekap memakai tanggal pembayaran yang disahkan,
  mengecualikan transaksi batal. Warga hanya mendapat agregat pembayaran sendiri;
  pengurus mendapat agregat seluruh pemasukan iuran. Angka ini diberi nama
  **pemasukan iuran**, bukan saldo kas lengkap. Pemasukan lain/pengeluaran belum ada.
- `dues_configuration()` tersedia bagi akun aktif. `update_dues_configuration`
  khusus pengurus dengan versi `updated_at`, menyimpan tarif dan tanggal untuk
  bulan berikutnya. Versi tarif disimpan per periode; warga yang baru aktif pada
  bulan berjalan memakai tarif bulan itu. Jatuh tempo 29–31 dijepit ke hari terakhir
  pada bulan lebih pendek. Nominal/tanggal/identitas tagihan tidak ditimpa.
- Rekening berlaku segera untuk konfirmasi baru. Setiap transfer menyimpan salinan
  rekening tujuan saat dikirim sehingga perubahan rekening tidak mengubah riwayat.
- Semua tabel memakai RLS dan tidak memberikan hak tulis langsung kepada browser.
  API memeriksa sesi Auth belum dicabut, akun aktif/nonarsip, kepemilikan atau
  role pengurus. Kesamaan KK tidak memberi akses ke warga lain. Cache mengikuti
  provider sesi/role yang sudah ada dan diinvalidasi setelah mutasi.
- Storage hanya mengizinkan unggah objek baru dan unduh berizin. Path
  `<warga UUID>/<request UUID>/<SHA-256>.<jpg|png|pdf>`. RPC memeriksa kepemilikan,
  keberadaan objek, ukuran dan MIME metadata. Tidak ada public/signed URL maupun
  policy UPDATE/DELETE. Respons unggah hilang dipulihkan dengan membandingkan
  checksum objek; unggahan yang belum terikat dapat tertinggal dan tetap privat.
  Pembersihan operator harus memastikan hasil pengiriman, menggunakan Storage API,
  serta tidak menghapus bukti yang masih dirujuk.

## Desain dan verifikasi

Sumber dibaca dan diekspor langsung dari `design.fig` melalui OpenPencil:
belum bayar `0:4158`, pembayaran `0:4216`, lunas `0:4319` (1648 × 1056).
Desain asli tidak diubah. Sidebar/header aplikasi yang sudah ada dipertahankan.
Kartu memakai radius 20 px; dialog maksimal 648 px, radius 22 px, padding 28 px.
Warna tombol mengikuti token aksi aksesibel `#087e34`. Dua kartu ringkasan dipakai
konsisten pada semua status. Tambahan pilihan metode/tanggal, filter, pagination,
detail dan kontrol pengurus melengkapi alur yang disetujui.

Playwright menyimpan screenshot pada 320, 375, 768, 1280 dan 1648 px ke `test-results/`.
Perbandingan visual memeriksa kartu, warna, tipografi, dialog, overflow, dan adaptasi
ponsel; tinggi dialog mengikuti isi tambahan. Tabel bergulir di region tersendiri.
Dialog memakai native dialog dengan siklus Tab, Escape, dan pengembalian fokus.

`npm test` menguji migrasi asli di PGlite: billing WIB/pergantian tahun/bulan pendek,
perubahan tarif, RLS, sesi dicabut, validasi bukti, kirim ulang, lock, pembatalan,
rekap kas dan riwayat. PGlite menserialkan transaksi, sehingga pengujian permintaan
bersamaan tidak menggantikan pengujian konkurensi PostgreSQL nyata.
Playwright memakai **API Auth/Database/Storage tiruan** dan data dummy; tidak
menghubungi cloud. Build/typecheck dan oxlint juga dijalankan.

Hasil pemeriksaan: build, typecheck, oxlint, format file yang berubah, serta
seluruh **47 tes database/handler** lulus. Seluruh **14 tes browser iuran** lulus.
Regresi browser lengkap: **63 dari 64 tes lulus**; tes autentikasi lama
`auth layouts fit 1440px without horizontal overflow` mengharapkan tinggi kartu
login 540 px tetapi mengukur 516 px. Kegagalan yang sama direproduksi pada salinan
`git archive HEAD` sebelum perubahan iuran, dengan font lokal berhasil dimuat.
Source autentikasi, stylesheet global, dan tes autentikasi tidak diubah.

Pemeriksaan kontras langsung menghasilkan: tombol putih/hijau 5,19:1, teks
sekunder pada putih 4,76:1 dan pada latar 4,55:1, badge Belum Bayar 5,30:1,
Lunas 6,49:1, Menunggu Verifikasi 6,37:1; seluruh pasangan melewati AA teks normal.
Linter `@google/design.md` yang disebut skill tidak dijalankan: paket belum
tersedia lokal, registry tidak dapat dijangkau dari sandbox, dan peninjauan
persetujuan otomatis menolak pengunduhan/eksekusi paket belum terverifikasi
dengan akses berkas proyek. Pemeriksaan token dan kontras dilakukan langsung.

Verifikasi cloud pada 4 November 2026 sudah mencakup skema/RLS, konfigurasi
Storage, dua pemanggilan manual generator, dua eksekusi scheduler nyata yang
`succeeded`, serta pemulihan jadwal harian. Rinciannya ada pada bagian hasil
penerapan di atas. Pengujian ulang lokal `npm test` menghasilkan 47/47 lulus.

Yang masih perlu dilakukan pada lingkungan uji terpisah: unggah/unduh bukti
lintas akun melalui Storage HTTP, sahkan dan batalkan satu pembayaran dummy
sambil membandingkan rekap, serta uji konkurensi dua koneksi PostgreSQL nyata.
Pengujian tersebut belum dijalankan pada proyek cloud ini agar tidak menambah
akun, bukti, pembayaran, atau catatan kas fiktif ke data yang digunakan pemilik.

Catatan migrasi Tailwind: catatan kegagalan tinggi kartu login di atas merupakan riwayat sebelum migrasi. Kontrol kini memakai standar bersama dan tes autentikasi memeriksa lebar serta overflow tanpa mengunci tinggi kartu. Hasil suite akhir dicatat di `docs/tailwind-migration.md`.
