# Use case diagram WargaKita

Buka `use-case-wargakita.drawio` di aplikasi draw.io Desktop, atau di
<https://app.diagrams.net> melalui **File → Open From → Device**. Seluruh aktor,
use case, modul, teks, dan konektor dapat diedit. Diagram disimpan dalam XML
tanpa kompresi dan tidak membutuhkan gambar atau font dari layanan eksternal.

Pratinjau tersedia sebagai `use-case-wargakita.png`. Versi vektor tersedia sebagai
`use-case-wargakita.svg`, dengan data diagram draw.io juga tertanam di dalamnya.

Diagram memuat 24 use case dalam enam modul:

1. Autentikasi: registrasi, login, dan logout.
2. Data warga dan akun: profil sendiri, data/akun warga, verifikasi, role,
   status akun, serta arsip/pemulihan.
3. Pengajuan surat pengantar: pengajuan, pemilihan jenis surat, status/riwayat
   sendiri, serta pengelolaan seluruh pengajuan dan lampiran.
4. Pengaduan warga: pengajuan, pemilihan kategori, status/hasil/riwayat sendiri,
   serta penanganan dan koreksi kategori oleh pengelola.
5. Iuran warga bulanan: tagihan/riwayat pribadi, konfirmasi tunai/transfer,
   verifikasi pembayaran, pengaturan iuran/rekening, serta rekap pemasukan.
6. Pengumuman terjadwal: pembacaan pengumuman aktif, pembuatan/perubahan jadwal,
   arsip, dan penayangan ulang.

Latar modul menggunakan warna pastel: biru untuk autentikasi (`#E8F1FD`), mint
untuk data warga (`#E5F5EC`), lavender untuk surat (`#EEE8FA`), peach untuk
pengaduan (`#FCEBDF`), kuning untuk iuran (`#FFF5D6`), dan merah muda untuk
pengumuman (`#FBE6EF`). Judul dan nomor modul tetap menjadi penanda utama.

## Kesetaraan role

Diagram memiliki tiga aktor: **Warga**, **Pengurus RT**, dan **Ketua RT**.
Ketiganya terhubung langsung ke use case **Login** dan **Logout**.
Pengurus RT dan Ketua RT memiliki asosiasi langsung ke layanan pengelolaan
dengan hak akses yang sama. Keduanya juga mewarisi layanan pribadi Warga,
sesuai route pribadi yang tersedia untuk kedua role.

Garis utuh menunjukkan asosiasi. Panah putus-putus `«include»` menunjuk ke
langkah wajib. Panah dengan segitiga kosong menunjuk ke aktor yang diwarisi.
Registrasi dan login ditampilkan sebagai kemampuan pengguna; pendaftaran mandiri
selalu menghasilkan role Warga.

## Kesesuaian dengan project

Sumber pemeriksaan adalah `src/App.tsx`, `isManager` pada
`src/features/residents/data.tsx`, fitur pada `src/features/`, `README.md`, dan
dokumentasi modul di `docs/`. Diagram mengikuti implementasi project saat
penyusunan, bukan seluruh rencana fitur pada PRD.

Jenis surat mengikuti project: Domisili, Usaha, SKCK, Tidak Mampu, Pindah,
Administrasi Kependudukan, Keterangan Warga, dan Lainnya. Pengajuan surat
memerlukan profil lengkap dan terverifikasi; pembuatan serta penyerahan dokumen
surat dilakukan manual. Pengaduan dan pembacaan pengumuman tidak mensyaratkan
verifikasi profil.

Pembayaran transfer wajib menyertakan bukti. Pembayaran tunai maupun transfer
menunggu pengesahan pengelola sebelum menjadi Lunas dan masuk rekap pemasukan.
Kas pengeluaran, saldo kas lengkap, cetak surat, cetak laporan, dan ekspor CSV
belum tersedia sehingga tidak dimasukkan sebagai use case.
