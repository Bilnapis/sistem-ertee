# Pembaruan password akun warga

Pengurus RT dan Ketua RT membuka **Data Warga → Lihat → Edit Data**, lalu mengisi
**Password Baru** dan **Konfirmasi Password Baru** pada bagian **Perbarui
Password**. Password harus berisi 8–128 karakter dan konfirmasinya harus sama.
Tombol **Perbarui Password** langsung memperbarui akun yang sedang diedit, tanpa
meminta password lama atau mengirim tautan reset email.

Form password terpisah dari form biodata. **Simpan Perubahan** hanya menyimpan
biodata/akses akun; **Perbarui Password** hanya mengganti password. Tekan Enter
pada input password untuk mengirim form password. Perubahan biodata yang belum
disimpan tetap ada di dialog. Setelah berhasil, kedua input password dikosongkan,
visibilitas kembali tersembunyi dan pesan sukses dibacakan melalui `role=status`.
Saat gagal, input dipertahankan untuk koreksi dan percobaan ulang. Seluruh aksi
penyimpanan dan penutupan dialog dinonaktifkan selama permintaan berjalan.

Kontrol ini hanya muncul pada editor pengelolaan warga yang sudah terdaftar,
bukan pada tambah warga atau edit profil sendiri. Akun warga yang tidak aktif
tetap bisa diperbarui passwordnya; akun yang diarsipkan harus dipulihkan dahulu.
Pembaruan password tidak mengaktifkan akun atau mengubah status verifikasi.

## Server

`POST /functions/v1/update-resident-password` menerima bearer token dan JSON
`{ "id": "UUID akun", "password": "password baru" }`, lalu mengembalikan `{id}`.
Konfirmasi password hanya diperiksa di browser dan tidak dikirim ke server.

Handler memverifikasi token melalui Auth, memanggil RPC
`resident_management_access` untuk memeriksa sesi yang masih ada dan role
pengelola aktif, membaca target dengan RLS pemanggil, menolak arsip, lalu
memeriksa ulang izin sebelum memanggil Auth Admin. Field tambahan seperti role
dan email tidak diteruskan ke Auth. Kunci service-role hanya dibaca dari
environment Edge Function. Password tidak ditulis ke profil, metadata atau
riwayat warga, dan respons tidak mengembalikan data Auth maupun rincian internal.

Pembaruan menggunakan
[`auth.admin.updateUserById`](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)
di server. Kegagalan kebijakan password Auth disajikan sebagai error field;
error provider lain menghasilkan kode aman untuk dicoba ulang.

## Penerapan

Tidak diperlukan migrasi database baru. Sebelum menggunakan frontend baru di
cloud, deploy Edge Function `update-resident-password` ke proyek Supabase yang
sama. Pengaturan `verify_jwt = false` sudah ada pada `supabase/config.toml`;
handler tetap memverifikasi bearer token serta sesi/role database sendiri,
seperti fungsi `create-resident` yang sudah tersedia.

Untuk lokal, jalankan `supabase functions serve update-resident-password` bersama
Supabase lokal dan Vite.

### Penerapan cloud — 6 November 2026

Edge Function `update-resident-password` sudah dideploy ke proyek **Sistem
ErTee** (`vzdkaqvrzsjrmnsbbkaz`) melalui CLI v3 dengan target proyek eksplisit
dan bundling API. Fungsi aktif pada versi **1**, dengan `verify_jwt = false`
sesuai konfigurasi. Ketiga berkas sumber yang diunduh ulang identik dengan
sumber lokal. Fungsi `create-resident` tetap pada versi 3.

Pembacaan definisi database cloud memastikan `resident_management_access`
memanggil pemeriksaan sesi yang masih ada, akun aktif, bukan arsip, serta role
`ketua_rt` atau `pengurus_rt`. Tidak ada migrasi atau perubahan data warga yang
diperlukan untuk penerapan ini.

Uji HTTP nyata menghasilkan OPTIONS `204`, GET `405 METHOD_NOT_ALLOWED`, serta
POST tanpa sesi dan dengan bearer tidak valid `401 SESSION_REQUIRED`. Header
CORS sesuai konfigurasi. Penggantian password dengan sesi pengelola nyata belum
diuji; tidak ada password akun nyata yang diganti dalam penerapan ini. Hosting
frontend tidak diubah.

## Pengujian

`tests/resident-password.test.mjs` menguji validasi server, otorisasi, pemeriksaan
ulang izin, target arsip/hilang, kebijakan password Auth, respons gagal, serta
pencegahan kebocoran password dalam respons. Pengujian database yang sudah ada
memverifikasi RPC akses untuk kedua role pengelola serta penolakan akun nonaktif
dan sesi yang dicabut.

`tests/e2e/residents.spec.ts` menguji alur kedua role, pemisahan form, Enter,
visibilitas password, pengosongan input setelah sukses, koreksi/retry, kontrol
disabled selama permintaan, serta tampilan 375 dan 1280 px. Pengujian memakai
respons Supabase tiruan dan tidak mengganti password akun nyata.
