# Manajemen warga

Fitur ini menyediakan daftar, pencarian, filter, pagination 10 baris, tambah
akun, detail/edit, verifikasi, pengarsipan dan pemulihan, serta edit profil
sendiri. Ketua RT dan Pengurus RT memiliki kemampuan sama. Warga hanya
mengakses profil dan riwayat sendiri, termasuk ketika memiliki nomor KK
yang sama dengan warga lain.

## Menyiapkan Supabase

1. Terapkan migrasi autentikasi lama terlebih dahulu, kemudian
   `supabase/migrations/20261103000100_resident_management.sql`. Dengan
   Supabase CLI yang sudah terhubung, gunakan `supabase db push`.
2. Deploy Edge Function menggunakan `supabase functions deploy create-resident`.
   CLI membaca `verify_jwt = false` dari `supabase/config.toml`. Handler
   tetap memvalidasi token pengguna melalui Auth dan pemeriksaan sesi/role
   pada database; fungsi bukan endpoint publik tanpa otorisasi.
3. Runtime fungsi memakai `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan
   `SUPABASE_SERVICE_ROLE_KEY` bawaan lingkungan Supabase. Kunci server
   tidak boleh dimasukkan ke variabel `VITE_*`. Frontend tetap hanya
   membutuhkan URL dan publishable/anon key pada `.env.local`.
4. Daftarkan satu akun dummy melalui `/register`, konfirmasi email bila
   diminta, lalu tetapkan pengelola pertama melalui SQL Editor tepercaya.
   Salin UUID akun tersebut dari Supabase Auth; jangan memakai UUID contoh
   sebagai akun sungguhan:

   ```sql
   update public.profiles
   set role = 'ketua_rt'
   where id = '<UUID akun dummy yang sudah didaftarkan>'::uuid;
   ```

5. Masuk ulang dan pilih menu **Warga**. Menu pengelola membuka
   `/admin/warga`. Akun berikutnya dapat dibuat melalui **Tambah warga**.

Migrasi mempertahankan data profil lama. Nomor KK, jenis kelamin, dan status
pernikahan awal boleh kosong untuk kompatibilitas; lengkapi melalui editor
sebelum melakukan verifikasi. RT/RW tetap 04/08 untuk instalasi satu RT.
Tidak ada data warga contoh yang otomatis ditambahkan ke aplikasi.

Untuk pengembangan lokal dengan CLI dan Docker tersedia, jalankan
`supabase start` dan `supabase functions serve create-resident`. Pada tahap
implementasi awal, belum ada migrasi cloud atau deployment hosting yang
dijalankan; hasil penerapan cloud berikut dicatat terpisah.

### Penerapan cloud — 3 November 2026

- Proyek: **Sistem ErTee** (`vzdkaqvrzsjrmnsbbkaz`), sesuai URL di
  `.env.local`. Migrasi autentikasi lama sudah ada dan tidak dijalankan ulang.
- Migrasi `20261103000100_resident_management.sql` diterapkan melalui SQL
  Editor pada dashboard yang sudah login. Pembacaan ulang memverifikasi
  sembilan kolom baru, tabel `resident_events`, enam RPC, RLS aktif, serta
  satu profil lama tetap tersimpan.
- `create-resident` dideploy melalui editor dashboard memakai bundle ESM
  dari sumber fungsi lokal (esbuild; impor npm Supabase tetap eksternal).
  Pengaturan **Verify JWT with legacy secret** disimpan OFF dan diverifikasi
  ulang setelah memuat ulang halaman. Validasi sesi dan role tetap dilakukan
  oleh handler dan database. Tidak ada service-role key yang dimasukkan ke
  frontend.
- Pemeriksaan endpoint cloud: POST tanpa sesi dan token tidak valid
  menghasilkan `401 SESSION_REQUIRED`, OPTIONS menghasilkan `204`, dan GET
  menghasilkan `405 METHOD_NOT_ALLOWED`.
- Atas pilihan pemilik proyek, akun yang sudah terdaftar dijadikan
  `ketua_rt`, bukan membuat akun dummy tambahan. Role aktif, email
  terkonfirmasi, dan satu event perubahan akses diverifikasi melalui
  pembacaan ulang database. Aplikasi yang memakai sesi pengguna yang sudah
  ada dimuat ulang; menu **Warga** berhasil membuka `/admin/warga` dan
  menampilkan satu warga dari database cloud.
- Pembuatan akun baru melalui **Tambah warga** belum dijalankan; tidak ada
  akun atau identitas uji tambahan yang dibuat. Deployment hosting frontend
  dan pengujian konkurensi dua koneksi PostgreSQL bukan bagian penerapan ini.

CLI tersedia melalui `npx --yes supabase`, tetapi belum login/terhubung.
Penerapan SQL Editor tidak otomatis mencatat riwayat migrasi CLI. Sebelum
memakai `db push` untuk migrasi berikutnya, login dan sinkronkan kedua versi
migrasi yang sudah diterapkan dengan `migration repair` pada proyek remote
tepat ini; jangan menjalankan ulang migrasi CREATE TABLE yang sudah ada.

## Kontrak dan otorisasi

- `POST /functions/v1/create-resident`: bearer token, `request_id` UUID,
  seluruh identitas, email/password, role, dan `is_active`; hasil `{id}`.
  ID permintaan tetap sama saat mencoba ulang input identik. UUID Auth
  ditetapkan dari ID tersebut; fingerprint tanpa password membatasi
  pemulihan hasil ke permintaan identik dari pengelola yang sama.
- Auth Admin membuat akun dengan email terkonfirmasi. Profil dan role
  dibuat dalam transaksi Auth melalui trigger. Metadata `ertee_creation`
  berada di `app_metadata` yang hanya ditulis server. Trigger memeriksa
  ulang sesi dan role pembuat; kegagalan profil membatalkan akun Auth.
  `user_metadata` registrasi publik selalu menghasilkan Warga aktif
  Menunggu Verifikasi.
- `list_residents`: pencarian literal, status/role/verifikasi, urutan
  terbaru atau nama, halaman; hasil `{items,total}` dibatasi 10 baris.
- `resident_summary`: jumlah nonarsip menurut status verifikasi.
- `update_resident`: identitas dan, hanya bagi pengelola, role/status akun.
  `review_resident`: Terverifikasi atau Perlu Perbaikan dengan alasan.
  `set_resident_archive`: arsip atau pulihkan dengan akun tetap nonaktif.
  Ketiganya memakai `p_expected_updated_at` untuk menolak perubahan basi.
- Pembacaan profil dan `resident_events` dilindungi RLS. Browser tidak
  memiliki izin INSERT/UPDATE/DELETE langsung. Pengelola yang dinonaktifkan
  atau diturunkan role-nya kehilangan izin pada permintaan berikutnya.
- Perubahan akses memakai advisory transaction lock yang sama. Pemeriksaan
  pengelola aktif terakhir berjalan setelah lock, sehingga permintaan
  bersamaan tidak dapat menonaktifkan semua pengelola.
- Riwayat mencatat pelaku, nama saat tindakan, waktu, dan hasil status;
  password tidak disimpan pada profil, metadata, atau riwayat.

Pada UI, perubahan identitas membatalkan verifikasi sebelumnya. Perubahan
role/status saja tidak membatalkan verifikasi. Arsip mempertahankan profil,
Auth user, dan riwayat; pemulihan membutuhkan aktivasi terpisah melalui edit.
Email dibaca saja pada editor profil. Pergantian email/password dan
penghapusan permanen bukan bagian fitur ini.

## Pengujian

`npm test` menjalankan migrasi SQL asli di PGlite serta handler provisioning
dengan gateway Auth tiruan. `npm run test:e2e` menguji UI dengan respons
Supabase tiruan; pengujian ini tidak mengirim email atau mengubah cloud.

Skenario meliputi ketiga role, kepemilikan data, metadata palsu, kelengkapan,
NIK duplikat, KK bersama, verifikasi ulang, riwayat, sesi dicabut, arsip,
pemulihan, pagination, hasil kosong, konflik versi, pengiriman ulang,
serta kegagalan penyimpanan yang mempertahankan input.

PGlite menjalankan transaksi pada satu engine, sehingga uji permintaan
penurunan role bersamaan memeriksa hasil serialisasi. Verifikasi tambahan
dengan dua koneksi PostgreSQL nyata tetap diperlukan saat penerapan:
jalankan penonaktifan dua pengelola terakhir serentak; tepat satu harus
berhasil dan yang lain menerima `LAST_ACTIVE_MANAGER`.

Screenshot Playwright untuk daftar dan dialog dibuat pada 1648, 1280, 768,
dan 375 px di `test-results/`. Sumber desain dan penyesuaian visual
didokumentasikan dalam `DESIGN.md`.

Hasil verifikasi implementasi: 29 pengujian database/handler dan 27 skenario
browser lulus; build TypeScript/Vite, oxlint, serta pemeriksaan tipe fungsi
oleh Deno lulus. Screenshot empat layar diperiksa pada lebar referensi
1648 px, serta adaptasi 1280, 768, dan 375 px. Layout mempertahankan header
dan sidebar aplikasi, menambahkan ringkasan/role/verifikasi, dan memakai
dialog yang dapat digulir agar seluruh kontrol tetap dapat dicapai.
