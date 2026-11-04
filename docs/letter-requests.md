# Pengajuan surat

Warga dan pengelola dengan profil lengkap/terverifikasi dapat mengajukan surat
pribadi. Ketua RT dan Pengurus RT memproses seluruh pengajuan dengan kewenangan
yang sama: **Pengajuan → Diproses → Selesai**. Pengerjaan dan penyerahan surat
dilakukan manual. Referensi `SRT-…` adalah nomor pengajuan, bukan nomor surat legal.

## Menyiapkan database dan Storage

Terapkan migrasi autentikasi dan manajemen warga terlebih dahulu, kemudian
`supabase/migrations/20261104000100_letter_requests.sql`. Migrasi baru menambah
dua tabel, empat RPC, helper otorisasi, serta bucket privat `letter-attachments`
dengan batas 5 MiB dan MIME JPG/PNG/PDF. Tidak ada seed atau akun tambahan.
Frontend memakai URL dan publishable/anon key yang sama; tidak memerlukan
service-role key atau Edge Function baru.

Cloud proyek ini sebelumnya menerapkan dua migrasi melalui SQL Editor, sehingga
riwayat CLI perlu disinkronkan sebelum `supabase db push`. Ikuti catatan pada
`docs/resident-management.md`; jangan menjalankan ulang migrasi CREATE TABLE lama.
Migrasi surat ini belum diterapkan ke cloud dan tidak ada deployment hosting.

Untuk Supabase lokal dengan CLI dan Docker tersedia, jalankan `supabase start`
atau reset hanya database lokal yang datanya boleh diganti. Stack akan menerapkan
migrasi berurutan termasuk skema Storage bawaan. Isi environment frontend dengan
URL/key lokal, buat akun dummy, lengkapi profil, dan verifikasi melalui pengurus.

## Route dan perilaku

| Route                                     | Perilaku                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `/warga/pengajuan-surat`                  | Daftar sendiri, pencarian, status, urutan dan empat baris per halaman.      |
| `/warga/pengajuan-surat/tambah`           | Dialog formulir dan pemilih delapan jenis surat.                            |
| `/warga/pengajuan-surat/:id`              | Detail, riwayat dan unduh lampiran sendiri.                                 |
| `/admin/pengajuan-surat`                  | Ringkasan dan daftar seluruh warga, pencarian, filter jenis/status, urutan. |
| `/admin/pengajuan-surat?status=pengajuan` | Pengajuan belum diproses dengan nomor urut dan blok rumah.                  |
| `/admin/pengajuan-surat/:id`              | Detail serta Mulai Proses/Selesai Diproses.                                 |

Nama/blok/nomor rumah dibaca saja dari profil. Server mengambil salinan identitas
saat pengajuan, termasuk NIK/KK/alamat; perubahan profil selanjutnya tidak
menimpa salinan itu. Nomor rumah lama boleh kosong, mengikuti aturan profil
yang sudah ada. Nomor HP aktif disalin sebagai kontak pengajuan, tanpa mengubah
profil. Pengajuan terkirim, isi dan lampirannya tidak dapat diedit warga.

Tombol Masih Diproses hanya menutup dialog. Selesai adalah status akhir.
Status terakhir dibaca ulang setelah mutasi, saat halaman kembali mendapat
fokus, dan melalui percobaan ulang pemuatan. Notifikasi global, realtime,
pembatalan/penolakan/perbaikan dan penerbitan PDF otomatis tidak termasuk modul ini.

## Kontrak dan keamanan

- `submit_letter_request(p_request_id, p_letter_type, p_purpose, p_contact_phone,
p_additional_notes, p_attachment)` mengembalikan pengajuan. UUID dibuat sekali
  per formulir, digunakan kembali pada percobaan ulang, dan dikunci saat transaksi.
  Pengiriman identik mengembalikan hasil yang sama; payload berbeda dengan ID yang
  sudah tersimpan ditolak. Pemohon tidak menjadi parameter yang dapat dipalsukan.
- `list_letter_requests(p_scope, p_search, p_type, p_status, p_sort, p_page)`
  mengembalikan `{items,total}`; scope `mine` selalu milik sesi, `all` khusus pengurus.
  Pencarian literal nama, label jenis dan referensi; urutan `newest`/`oldest` stabil.
- `letter_summary()` khusus pengurus mengembalikan `total`, `pengajuan`,
  `diproses`, `selesai`, terlepas dari filter daftar.
- `advance_letter_request(p_id, p_status, p_expected_updated_at)` memeriksa
  pengurus aktif, mengunci baris, memeriksa versi dan hanya menerima transisi maju
  satu langkah. Trigger mencatat status sebelumnya/berikutnya, pelaku, jabatan
  saat tindakan dan waktu. Browser tidak dapat menulis tabel secara langsung.
- RLS memeriksa sesi Auth yang belum dicabut, profil aktif/nonarsip, serta pemilik
  atau role pengurus pada setiap pembacaan data/riwayat/lampiran. Nomor KK yang sama
  tidak memberi akses kepada warga lain. Cache query juga dibatasi sesi/role.
- Lampiran memakai path `<user UUID>/<request UUID>/<SHA-256>.<jpg|png|pdf>`.
  Upload dilakukan melalui Storage API sebelum RPC finalisasi. Bucket membatasi
  ukuran/MIME, dan RPC memeriksa path, keberadaan objek, ukuran serta metadata.
  Tidak ada public URL atau signed URL; unduhan melalui API dengan sesi aktif.
- Upload memakai `upsert: false`. Bila respons upload hilang, browser membandingkan
  checksum objek yang sudah ada sebelum melanjutkan. Tidak ada kebijakan browser
  UPDATE/DELETE, sehingga lampiran yang sudah dirujuk tidak bisa dihapus/ditimpa.
  Lampiran yang belum terikat tetap privat dan dapat dipakai ulang oleh formulir.
  Unggahan dari formulir yang ditinggalkan dapat tertinggal: pembersihan operasional
  hanya melalui Storage API tepercaya setelah memastikan pengajuan tidak ada;
  jangan menghapus saat hasil pengiriman belum pasti atau langsung dari tabel objek.

## Validasi

`npm test` menjalankan migrasi asli di PGlite. Skema metadata Storage ditiru
untuk menguji policy dan pemeriksaan RPC; pengujian ini bukan layanan Storage HTTP.
Playwright menggunakan API Auth/Database/Storage tiruan serta identitas dummy.
Cakupan: tiga peran, kepemilikan, profile gate, pencarian/pagination, urutan status,
konflik versi, percobaan ulang, lampiran invalid, kegagalan unggah/simpan dan dialog.

Screenshot browser dihasilkan di `test-results/` pada 320, 375, 768, 1280 dan 1648 px.
Referensi desktop diekspor langsung dari `design.fig` menggunakan OpenPencil.
Tinggi dialog detail mengikuti isi agar informasi yang terpotong pada frame sumber
tetap terbaca. Label filter, riwayat dan kontak/lampiran adalah tambahan fungsional;
sidebar mempertahankan komponen yang sebelumnya sudah diterapkan. Border
TextInput mengikuti komponen bersama yang lebih tegas daripada sumber desain.
Tombol menu ponsel dan komponen Keluar dihubungkan kembali pada layout bersama.

Pemeriksaan implementasi 4 November 2026: build, lint, pemeriksaan format berkas
terkait, 37 pengujian Node/database dan 45 pengujian Playwright lulus.

Docker dan Supabase CLI lokal belum tersedia pada lingkungan implementasi,
sehingga smoke test layanan Storage sungguhan belum dijalankan. Setelah stack
tersedia, uji unggah JPG/PNG/PDF, penolakan berkas >5 MiB/MIME lain, unduh dengan
pemohon/kedua pengurus, penolakan warga lain/akun nonaktif/sesi dicabut, serta
penolakan upsert/delete. Pengujian konkurensi dua koneksi PostgreSQL dan penerapan
cloud juga belum diklaim; PGlite memverifikasi penolakan versi basi secara berurutan.

Setelah migrasi Tailwind, utility surat berada di `src/features/letters/styles.ts`; form memakai gap 16 px, kontrol minimum 48 px dan dialog beradius 22 px. Batas lebar form/detail/pemilih tetap 1000/912/528 px. Hasil validasi bersama dicatat di `docs/tailwind-migration.md`.
