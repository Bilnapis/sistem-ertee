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
sebelum melakukan verifikasi. Instalasi ini memakai RT 04 yang sudah ditentukan,
tanpa RW. Form tambah/edit warga dan edit profil sendiri tidak menampilkan
input nomor rumah, RT, atau RW. Nomor rumah juga dihapus dari profil,
payload, pencarian, dan kolom penyimpanan melalui migrasi lanjutan di bawah.
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

CLI v3 sudah login dan tertaut ke proyek `vzdkaqvrzsjrmnsbbkaz`. Riwayat lama
yang sebelumnya dipasang melalui SQL Editor sudah disinkronkan saat penerapan
pengumuman pada 5 November 2026. Setelah penghapusan blok dan nomor rumah, seluruh lima belas
versi migrasi lokal dan cloud sinkron. Gunakan target eksplisit
`--remote=vzdkaqvrzsjrmnsbbkaz`; jangan menjalankan ulang migrasi CREATE TABLE
yang sudah ada.

## Penghapusan nomor rumah

Nomor rumah tidak lagi disimpan pada `profiles`, dikirim pada pendaftaran atau
pembuatan/edit warga, maupun ditampilkan pada profil, surat, iuran, dan pengaduan.
Pencarian warga memakai nama atau NIK; pencarian iuran memakai nama warga.
Alamat lengkap tetap tersedia.

Empat migrasi baru disiapkan untuk diterapkan sesuai urutan:

1. `20261105000700_letters_without_house_number.sql`
2. `20261105000800_dues_without_house_number.sql`
3. `20261105000900_complaints_without_house_number.sql`
4. `20261105001000_remove_resident_house_number.sql`

Tiga migrasi pertama menghentikan pembacaan nomor rumah pada layanan terkait.
Migrasi terakhir memperbarui trigger registrasi, audit, dan RPC warga, lalu
menghapus kolom `profiles.house_number`, termasuk nilai yang sudah tersimpan.
Field lama ditolak oleh RPC edit warga dan diabaikan saat normalisasi pendaftaran.
Kolom lain, waktu pembaruan, verifikasi, dan riwayat warga tetap dipertahankan.
Salinan identitas historis layanan lama tetap tersimpan; pengajuan dan tagihan
baru tidak lagi menyertakan nomor rumah. Deploy ulang `create-resident` dan
frontend bersama perubahan ini.

### Penerapan nomor rumah ke cloud — 5 November 2026

Keempat migrasi nomor rumah sudah diterapkan ke proyek **Sistem ErTee**
(`vzdkaqvrzsjrmnsbbkaz`) melalui CLI v3 dengan
`db push --remote=vzdkaqvrzsjrmnsbbkaz --skip-vault --yes`. Dry run memastikan
hanya empat migrasi tersebut yang tertunda; sepuluh fungsi SQL cloud cocok
dengan baseline lokal sebelum penerapan. Seluruh 15 versi migrasi lokal dan
cloud kini sinkron.

Pembacaan ulang memastikan `profiles.house_number` sudah tidak ada dan tidak
ada fungsi SQL aplikasi yang masih merujuknya. Sepuluh fungsi yang diperbarui
cocok dengan sumber migrasi lokal; signature, hak akses, `search_path`, dan
kebijakan RLS tetap sama. Sidik data kedua profil setelah mengecualikan nomor
rumah identik sebelum dan sesudah migrasi. Ketiga event riwayat serta satu
surat, dua tagihan iuran, dan satu pengaduan yang sudah tersimpan juga identik.

Edge Function `create-resident` dideploy ulang melalui API dan aktif pada
versi **3**, dengan `verify_jwt = false` sesuai konfigurasi. Pemeriksaan sesi
dan role tetap dijalankan handler serta database. Ketiga berkas sumber yang
diunduh ulang identik dengan sumber lokal; normalisasi profil tidak lagi
menyertakan nomor rumah. Uji HTTP nyata menghasilkan GET `405 METHOD_NOT_ALLOWED`,
OPTIONS `204`, serta POST tanpa sesi dan dengan bearer tidak valid
`401 SESSION_REQUIRED`.

Pemeriksaan ini tidak membuat akun atau data warga tambahan. Pembuatan akun
dengan sesi pengelola nyata belum diuji pada penerapan ini. Hosting frontend
tidak diubah. Catatan blok rumah berikut adalah riwayat sebelum migrasi nomor
rumah.

## Penghapusan blok rumah

Blok rumah tidak lagi dikumpulkan pada pendaftaran, tambah/edit warga, atau
profil sendiri. Kolom tersebut juga tidak ditampilkan pada surat, iuran, dan
pengaduan. Alamat dan nomor rumah yang sudah tersimpan tetap dipertahankan.
Pencarian warga memakai nama, NIK, atau nomor rumah; pencarian iuran memakai
nama atau nomor rumah.

Terapkan empat migrasi berikut sesuai urutan sebelum memakai frontend dan
Edge Function terbaru:

1. `20261105000300_letters_without_house_block.sql`
2. `20261105000400_dues_without_house_block.sql`
3. `20261105000500_complaints_without_house_block.sql`
4. `20261105000600_remove_resident_house_block.sql`

Tiga migrasi pertama menghentikan pembacaan blok rumah pada layanan terkait.
Migrasi terakhir memperbarui trigger registrasi, validasi, audit, dan RPC warga,
lalu menghapus kolom `profiles.house_block`. Penghapusan kolom tidak mengubah
status verifikasi, waktu pembaruan, atau data profil lainnya. Salinan identitas
historis pada layanan lama tetap tersimpan; pengajuan dan tagihan baru tidak
lagi menyertakan blok rumah. Deploy ulang `create-resident` setelah migrasi.

### Penerapan cloud — 5 November 2026

Keempat migrasi di atas sudah diterapkan ke proyek **Sistem ErTee**
(`vzdkaqvrzsjrmnsbbkaz`) melalui CLI v3 dengan
`db push --remote=vzdkaqvrzsjrmnsbbkaz --skip-vault --yes`. Sebelum penerapan,
dry run memastikan hanya empat migrasi tersebut yang dijalankan; sepuluh fungsi
SQL cloud cocok dengan baseline lokal. Migrasi lama, seed, role tambahan, dan
Vault tidak diterapkan ulang.

Pembacaan ulang database memastikan kolom `profiles.house_block` tidak ada dan
tidak ada fungsi SQL aplikasi yang masih merujuknya. Kesepuluh fungsi yang
diperbarui cocok dengan isi migrasi baru; signature, hak akses, pengaturan
`search_path`, dan RLS tetap sama. Sidik data kedua profil, setelah mengabaikan
kolom yang dihapus, identik sebelum dan sesudah migrasi. Ketiga event riwayat
juga identik. Nomor rumah serta satu surat, dua tagihan iuran, dan satu pengaduan
yang sudah ada tetap tersimpan.

Edge Function `create-resident` dideploy ulang melalui API dan aktif pada
versi **2**, dengan `verify_jwt = false` sesuai konfigurasi. Sesi dan role tetap
divalidasi oleh handler dan database. Ketiga berkas sumber yang diunduh kembali
dari cloud identik dengan sumber lokal dan tidak lagi menyebut `house_block`.
Uji HTTP nyata menghasilkan GET `405 METHOD_NOT_ALLOWED`, OPTIONS `204`, serta
POST tanpa sesi dan dengan bearer tidak valid `401 SESSION_REQUIRED`.

Pemeriksaan ini tidak membuat akun warga baru. Pembuatan akun dengan sesi
pengelola nyata belum diuji pada penerapan ini. Hosting frontend tidak diubah.

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
