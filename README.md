# Sistem ErTee

Aplikasi layanan RT menggunakan React, Vite, TypeScript, React Router v7, TanStack Query, Tailwind CSS, dan Supabase. Fitur tersedia mencakup **autentikasi, manajemen warga dan akun, verifikasi, arsip, pembaruan profil sendiri, pengajuan surat, serta iuran warga bulanan**.

## Menjalankan aplikasi

Gunakan Node.js 22.12+ atau versi LTS yang lebih baru.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Buka URL yang ditampilkan Vite, biasanya `http://localhost:5173`. Tanpa konfigurasi Supabase, halaman login dan register dapat dilihat, tetapi pengiriman formulir akan menjelaskan bahwa layanan belum terhubung. Tidak ada autentikasi demo yang menyamar sebagai login berhasil.

## Format kode

Proyek menggunakan Prettier dengan aturan pada [`.prettierrc.json`](.prettierrc.json): tanpa titik koma, kutip tunggal, indentasi 2 spasi, dan akhir baris LF.

Untuk format otomatis saat menyimpan, buka folder proyek di VS Code atau Cursor lalu instal ekstensi **Prettier - Code formatter** (`esbenp.prettier-vscode`) dari rekomendasi workspace. Pengaturan workspace sudah mengaktifkan **Format On Save** dan menjadikan Prettier sebagai formatter default.

```sh
npm run format        # Format seluruh file yang didukung
npm run format:check  # Periksa format tanpa mengubah file
```

Dependency, hasil build, laporan pengujian, dan `package-lock.json` diabaikan saat format.

Tailwind v4 menggunakan konfigurasi CSS-first di `src/styles.css`. Semua utility
class ditulis langsung pada atribut `className` di JSX, termasuk varian tombol,
kontrol formulir dan dialog. Gunakan `cn` dari `src/lib/cn.ts` untuk kondisi atau
class tambahan dari pemanggil. Jangan menaruh class dalam object, konstanta
styling atau modul terpisah. Prettier mengurutkan class pada JSX dan pemanggilan
`cn`. Panduan token, pengecualian CSS dan hasil validasi tersedia di
[`docs/tailwind-migration.md`](docs/tailwind-migration.md).

## Menghubungkan Supabase

1. Buat project Supabase pengembangan yang masih kosong.
2. Buka SQL Editor dan jalankan seluruh isi [`supabase/migrations/20261102000100_resident_auth.sql`](supabase/migrations/20261102000100_resident_auth.sql) sekali. Alternatif dengan CLI: `npx supabase login`, `npx supabase link --project-ref <project-ref>`, lalu `npx supabase db push`.
3. Buka dialog **Connect** di dashboard Supabase. Isi `.env.local` dengan Project URL dan publishable key:

   ```dotenv
   VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Legacy anon key juga diterima, melalui variabel tersebut atau `VITE_SUPABASE_ANON_KEY`. Secret key dan `service_role` tidak digunakan oleh aplikasi browser.

4. Aktifkan provider Email/password dan pendaftaran pengguna. Atur panjang password minimum **8 karakter**. Aktifkan **Confirm email** bila ingin alur konfirmasi email.
5. Pada konfigurasi URL Auth, isi Site URL `http://localhost:5173` dan tambahkan Redirect URL `http://localhost:5173/auth/callback`. Jika memakai `127.0.0.1`, tambahkan URL callback dengan host tersebut juga. Ketika deployment, tambahkan domain dan callback deployment yang sebenarnya.
6. Restart `npm run dev` setelah mengubah variabel lingkungan.

Gunakan akun dan identitas fiktif. Untuk pengujian email tanpa mengirim email sungguhan, gunakan Supabase lokal di bawah. Pada project cloud, sesuaikan pengiriman email uji dengan konfigurasi email project tersebut.

### Supabase lokal (opsional)

Dengan Supabase CLI dan Docker yang sudah tersedia:

```sh
npx supabase start
npx supabase status
```

Migrasi diterapkan saat stack lokal diinisialisasi. Salin API URL dan anon/publishable key dari status ke `.env.local`. Konfigurasi lokal ada pada [`supabase/config.toml`](supabase/config.toml), dengan konfirmasi email aktif. Buka penangkap email lokal di `http://localhost:54324` untuk mengambil tautan konfirmasi akun dummy, misalnya `warga.satu@example.test`.

## Alur yang tersedia

| Route                                                                                   | Perilaku                                                                                      |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `/login`                                                                                | Masuk dengan email/password; pilihan menyimpan sesi dan kontrol tampil/sembunyikan password.  |
| `/register`                                                                             | Nama, email, NIK dummy 16 digit, nomor HP, alamat, blok rumah, password, dan konfirmasi.      |
| `/auth/callback`                                                                        | Menangani konfirmasi email Supabase menggunakan PKCE.                                         |
| `/warga`                                                                                | Dashboard terlindungi dengan sidebar, profil milik sesi aktif, dan tombol Keluar.             |
| `/warga/profil`                                                                         | Profil warga sendiri, dibuka dari menu Warga.                                                 |
| `/admin/warga`                                                                          | Daftar, pencarian, filter role/status/verifikasi, dan pagination bagi Ketua RT/Pengurus RT.   |
| `/admin/warga/tambah`                                                                   | Menambah data warga sekaligus akun login.                                                     |
| `/admin/warga/:id`, `/admin/warga/:id/edit`                                             | Detail, edit, role/status akun, verifikasi, arsip/pemulihan, dan riwayat.                     |
| `/warga/pengajuan-surat`, `/warga/pengajuan-surat/tambah`, `/warga/pengajuan-surat/:id` | Daftar sendiri, pengajuan baru, detail, riwayat dan lampiran privat.                          |
| `/admin/pengajuan-surat`, `/admin/pengajuan-surat/:id`                                  | Daftar seluruh warga, ringkasan dan pemrosesan surat oleh pengurus.                           |
| `/warga/iuran-warga`, `/warga/iuran-warga/:id`, `/warga/iuran-warga/:id/bayar`          | Tagihan pribadi, riwayat dan konfirmasi Tunai/Cash atau Transfer dengan bukti privat.         |
| `/admin/iuran-warga`, `/admin/iuran-warga/:id`, `/admin/iuran-warga/pengaturan`         | Daftar seluruh tagihan, verifikasi/pembatalan, rekap pemasukan dan pengaturan tarif/rekening. |
| `/warga/pengaduan`                                                                      | Halaman terlindungi dengan keterangan layanan yang sedang disiapkan.                          |

Registrasi membuat Auth user dan profil secara atomik melalui trigger. Profil baru selalu berperan `warga`, aktif, dan berstatus `menunggu_verifikasi`, termasuk jika request memalsukan metadata peran. Dengan konfirmasi email aktif, buka tautan pada browser yang dipakai mendaftar; tab baru didukung. Dengan konfirmasi email nonaktif, register dapat langsung menghasilkan sesi.

“Ingat saya” menyimpan sesi pada `localStorage`; tanpa centang, sesi disimpan pada `sessionStorage` tab. Verifier PKCE disimpan lintas tab agar konfirmasi email dapat dibuka dari email. Logout menghapus sesi browser dan mencabut sesi Supabase saat ini. RLS juga memeriksa keberadaan sesi Auth agar token dari sesi yang sudah dicabut tidak dapat membaca profil.

## Manajemen warga dan batas fitur

- Ketua RT dan Pengurus RT memiliki kewenangan sama untuk mengelola data/akun, role, status aktif, verifikasi/perbaikan, serta arsip/pemulihan. Pengelola aktif terakhir tidak dapat dinonaktifkan, diarsipkan, atau diturunkan menjadi Warga.
- Warga dapat mengedit identitas sendiri, termasuk nomor KK, jenis kelamin, dan status pernikahan. Perubahan identitas memerlukan verifikasi ulang. Tanggal lahir, kas lengkap dan pengaduan belum termasuk fitur ini. RBAC surat dan iuran tersedia melalui modul masing-masing.
- Setelah migrasi autentikasi, terapkan migrasi manajemen warga dan deploy Edge Function `create-resident`. Panduan lengkap, bootstrap Ketua RT pertama, kontrak API, serta batas pengujian ada di [`docs/resident-management.md`](docs/resident-management.md).
- Pendaftaran mandiri menyesuaikan permintaan terbaru pengguna. Login menggunakan **email** sesuai PRD; desain memakai HP/NIK. HP/NIK tetap dikumpulkan sebagai data profil dan bukan identitas login pada tahap ini.
- Tombol “Lupa password?” membuka petunjuk menghubungi pengurus. Pemulihan mandiri belum tersedia.
- Pekerjaan fitur ini tidak menerapkan migrasi ke Supabase cloud atau membuat deployment hosting.

Pembuatan user langsung melalui Admin API/Dashboard harus menyertakan seluruh metadata profil yang diwajibkan trigger. Gunakan formulir register untuk pendaftaran mandiri, atau **Tambah warga** melalui akun pengelola.

## Pengajuan surat

Warga dengan profil lengkap dan terverifikasi dapat mengajukan delapan jenis
surat untuk diri sendiri, dengan keperluan, kontak, keterangan dan satu lampiran
opsional JPG/PNG/PDF maksimal 5 MB. Ketua RT dan Pengurus RT memproses seluruh
pengajuan dengan status **Pengajuan → Diproses → Selesai**. Pengerjaan dan
penyerahan surat dilakukan manual; pengajuan terkirim dibaca saja.

Setelah dua migrasi sebelumnya, terapkan
[`20261104000100_letter_requests.sql`](supabase/migrations/20261104000100_letter_requests.sql).
Migrasi ini juga membuat bucket privat dan kebijakan lampiran. Panduan pemasangan,
kontrak API, catatan riwayat migrasi cloud yang sebelumnya diterapkan manual,
serta batas pengujian ada di [`docs/letter-requests.md`](docs/letter-requests.md).
Tidak ada migrasi cloud atau deployment hosting yang dilakukan pada tahap ini.

## Iuran warga bulanan

Setiap profil aktif mendapat satu tagihan per bulan, tarif awal **Rp50.000** dan
jatuh tempo tanggal **10 bulan berjalan**. Warga mengonfirmasi Tunai/Cash tanpa
lampiran atau Transfer dengan bukti JPG/PNG/PDF maksimal 5 MB. Kedua metode
menunggu pengesahan Ketua RT/Pengurus RT sebelum menjadi Lunas dan masuk kas.
Penolakan/pembatalan menyimpan alasan dan riwayat. Tarif dan jatuh tempo baru
berlaku bulan berikutnya; rekening diatur pengurus untuk mengaktifkan transfer.

Setelah tiga migrasi sebelumnya, terapkan
[`20261104000200_monthly_dues.sql`](supabase/migrations/20261104000200_monthly_dues.sql),
lalu pasang job otomatis dengan [`monthly-dues.sql`](supabase/cron/monthly-dues.sql)
sebagai pemilik database. Scheduler terpisah dari migrasi inti. Panduan route,
kontrak, privasi, perhitungan kas, serta batas pengujian ada di
[`docs/monthly-dues.md`](docs/monthly-dues.md).
Pemasukan lain, pengeluaran, saldo kas lengkap dan ekspor CSV belum termasuk tahap ini.
Migrasi/Cron cloud dan deployment hosting belum dijalankan.

## Pengujian

```sh
npm run build
npm test
npm run test:e2e
```

`npm test` menjalankan migrasi asli pada PostgreSQL/WASM (PGlite) dan handler provisioning dengan gateway Auth tiruan. Cakupan meliputi constraint, trigger, privilege, RLS lintas warga, role, verifikasi, arsip, surat/lampiran, konflik versi, pengiriman ulang, akun nonaktif, dan sesi yang dicabut. Pengujian browser memakai Playwright dengan Google Chrome terpasang serta **respons API Supabase tiruan**. Tidak ada permintaan ke project cloud dalam pengujian tersebut.

Jika Chrome belum tersedia, instal Chrome atau ubah `channel` pada [`playwright.config.ts`](playwright.config.ts) sesuai browser pengujian yang tersedia. Screenshot responsif dibuat di `test-results/` dan diabaikan Git. Pengujian nyata terhadap Supabase Auth, pengiriman email, dan deployment tetap perlu dilakukan setelah project dikonfigurasi. Lihat [`docs/auth-acceptance.md`](docs/auth-acceptance.md).

## Struktur

```text
src/features/auth/       Formulir, validasi, session provider, dan pesan kesalahan
src/features/residents/  Beranda, profil sendiri dan manajemen warga
src/features/letters/    Pengajuan pribadi, pemrosesan pengurus dan lampiran
src/features/dues/       Tagihan bulanan, pembayaran, verifikasi dan pengaturan
src/components/          Komponen formulir dan umpan balik
src/lib/                 Supabase client dan tipe database
supabase/                Konfigurasi lokal dan migrasi PostgreSQL
tests/                   Pengujian database dan alur browser
```

Desain bersumber dari frame `0:3801` (login) dan `0:3824` (register) pada [`design.fig`](design.fig), dibaca dan diekspor melalui OpenPencil. Perbandingan implementasi dicatat dalam [`docs/design-implementation.md`](docs/design-implementation.md).

Referensi: [Vite](https://vite.dev/guide/), [Supabase Auth untuk React](https://supabase.com/docs/guides/auth/quickstarts/react), [pengelolaan profil](https://supabase.com/docs/guides/auth/managing-user-data), [sesi dan pencabutan akses](https://supabase.com/docs/guides/auth/sessions).
