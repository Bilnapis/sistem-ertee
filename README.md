# Sistem ErTee

Aplikasi layanan RT menggunakan React, Vite, TypeScript, React Router v7, TanStack Query, Tailwind CSS, dan Supabase. Fitur tersedia mencakup **autentikasi, manajemen warga dan akun, verifikasi, arsip, serta pembaruan profil sendiri**.

## Menjalankan aplikasi

Gunakan Node.js 22.12+ atau versi LTS yang lebih baru.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Buka URL yang ditampilkan Vite, biasanya `http://localhost:5173`. Tanpa konfigurasi Supabase, halaman login dan register dapat dilihat, tetapi pengiriman formulir akan menjelaskan bahwa layanan belum terhubung. Tidak ada autentikasi demo yang menyamar sebagai login berhasil.

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

| Route | Perilaku |
| --- | --- |
| `/login` | Masuk dengan email/password; pilihan menyimpan sesi dan kontrol tampil/sembunyikan password. |
| `/register` | Nama, email, NIK dummy 16 digit, nomor HP, alamat, blok rumah, password, dan konfirmasi. |
| `/auth/callback` | Menangani konfirmasi email Supabase menggunakan PKCE. |
| `/warga` | Dashboard terlindungi dengan sidebar, profil milik sesi aktif, dan tombol Keluar. |
| `/warga/profil` | Profil warga sendiri, dibuka dari menu Warga. |
| `/admin/warga` | Daftar, pencarian, filter role/status/verifikasi, dan pagination bagi Ketua RT/Pengurus RT. |
| `/admin/warga/tambah` | Menambah data warga sekaligus akun login. |
| `/admin/warga/:id`, `/admin/warga/:id/edit` | Detail, edit, role/status akun, verifikasi, arsip/pemulihan, dan riwayat. |
| `/warga/pengajuan-surat`, `/warga/iuran-warga`, `/warga/pengaduan` | Halaman terlindungi dengan keterangan layanan yang sedang disiapkan. |

Registrasi membuat Auth user dan profil secara atomik melalui trigger. Profil baru selalu berperan `warga`, aktif, dan berstatus `menunggu_verifikasi`, termasuk jika request memalsukan metadata peran. Dengan konfirmasi email aktif, buka tautan pada browser yang dipakai mendaftar; tab baru didukung. Dengan konfirmasi email nonaktif, register dapat langsung menghasilkan sesi.

“Ingat saya” menyimpan sesi pada `localStorage`; tanpa centang, sesi disimpan pada `sessionStorage` tab. Verifier PKCE disimpan lintas tab agar konfirmasi email dapat dibuka dari email. Logout menghapus sesi browser dan mencabut sesi Supabase saat ini. RLS juga memeriksa keberadaan sesi Auth agar token dari sesi yang sudah dicabut tidak dapat membaca profil.

## Manajemen warga dan batas fitur

- Ketua RT dan Pengurus RT memiliki kewenangan sama untuk mengelola data/akun, role, status aktif, verifikasi/perbaikan, serta arsip/pemulihan. Pengelola aktif terakhir tidak dapat dinonaktifkan, diarsipkan, atau diturunkan menjadi Warga.
- Warga dapat mengedit identitas sendiri, termasuk nomor KK, jenis kelamin, dan status pernikahan. Perubahan identitas memerlukan verifikasi ulang. Tanggal lahir dan RBAC modul surat/keuangan/pengaduan belum termasuk fitur ini.
- Setelah migrasi autentikasi, terapkan migrasi manajemen warga dan deploy Edge Function `create-resident`. Panduan lengkap, bootstrap Ketua RT pertama, kontrak API, serta batas pengujian ada di [`docs/resident-management.md`](docs/resident-management.md).
- Pendaftaran mandiri menyesuaikan permintaan terbaru pengguna. Login menggunakan **email** sesuai PRD; desain memakai HP/NIK. HP/NIK tetap dikumpulkan sebagai data profil dan bukan identitas login pada tahap ini.
- Tombol “Lupa password?” membuka petunjuk menghubungi pengurus. Pemulihan mandiri belum tersedia.
- Pekerjaan fitur ini tidak menerapkan migrasi ke Supabase cloud atau membuat deployment hosting.

Pembuatan user langsung melalui Admin API/Dashboard harus menyertakan seluruh metadata profil yang diwajibkan trigger. Gunakan formulir register untuk pendaftaran mandiri, atau **Tambah warga** melalui akun pengelola.

## Pengujian

```sh
npm run build
npm test
npm run test:e2e
```

`npm test` menjalankan migrasi asli pada PostgreSQL/WASM (PGlite) dan handler provisioning dengan gateway Auth tiruan. Cakupan meliputi constraint, trigger, privilege, RLS lintas warga, role, verifikasi, arsip, konflik versi, pengiriman ulang, akun nonaktif, dan sesi yang dicabut. Pengujian browser memakai Playwright dengan Google Chrome terpasang serta **respons API Supabase tiruan**. Tidak ada permintaan ke project cloud dalam pengujian tersebut.

Jika Chrome belum tersedia, instal Chrome atau ubah `channel` pada [`playwright.config.ts`](playwright.config.ts) sesuai browser pengujian yang tersedia. Screenshot responsif dibuat di `test-results/` dan diabaikan Git. Pengujian nyata terhadap Supabase Auth, pengiriman email, dan deployment tetap perlu dilakukan setelah project dikonfigurasi. Lihat [`docs/auth-acceptance.md`](docs/auth-acceptance.md).

## Struktur

```text
src/features/auth/       Formulir, validasi, session provider, dan pesan kesalahan
src/features/residents/  Beranda dan profil warga sendiri
src/components/          Komponen formulir dan umpan balik
src/lib/                 Supabase client dan tipe database
supabase/                Konfigurasi lokal dan migrasi PostgreSQL
tests/                   Pengujian database dan alur browser
```

Desain bersumber dari frame `0:3801` (login) dan `0:3824` (register) pada [`design.fig`](design.fig), dibaca dan diekspor melalui OpenPencil. Perbandingan implementasi dicatat dalam [`docs/design-implementation.md`](docs/design-implementation.md).

Referensi: [Vite](https://vite.dev/guide/), [Supabase Auth untuk React](https://supabase.com/docs/guides/auth/quickstarts/react), [pengelolaan profil](https://supabase.com/docs/guides/auth/managing-user-data), [sesi dan pencabutan akses](https://supabase.com/docs/guides/auth/sessions).
