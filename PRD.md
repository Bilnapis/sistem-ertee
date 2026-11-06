# Product Requirements Document (PRD)

# Sistem WargaKita — Sistem Informasi Pelayanan Administrasi Warga RT Berbasis Web

| Atribut           | Keterangan                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| Versi             | 1.2                                                                                                                |
| Tanggal           | 4 November 2026                                                                                                    |
| Status            | Draf untuk ditinjau; belum merupakan laporan hasil implementasi atau pengujian                                     |
| Nama kerja produk | Sistem WargaKita                                                                                                       |
| Konteks           | Capstone Project STSI4440, Kelas 57, Kelompok A, Universitas Terbuka, tahun ajaran 2026/2027                       |
| Sumber utama      | `Proposal_Capstone Project - STSI4440 (Kel. A).docx`                                                               |
| Pembaca           | Tim pengembang, penguji, dosen pembimbing, Ketua RT, dan Pengurus RT                                               |
| Target keluaran   | Purwarupa web fungsional untuk satu lingkungan RT dengan seluruh data pengembangan dan pengujian berupa data dummy |

## 1. Dasar Penyusunan dan Keputusan Produk

PRD ini menerjemahkan proposal menjadi kebutuhan produk yang dapat dikembangkan dan diuji. Jika terdapat perbedaan antara proposal dan keputusan pengguna dalam percakapan penyusunan, keputusan pengguna menjadi acuan. Rincian yang belum ditetapkan keduanya ditulis sebagai **asumsi MVP**, bukan sebagai ketentuan asli proposal.

### 1.1 Penyesuaian terhadap proposal

| Topik                | Isi proposal                                                                                                          | Keputusan untuk PRD                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modul utama          | Bab I menetapkan administrasi warga, pengumuman, serta iuran dan kas. Diagram pada Bab II juga memuat aspirasi warga. | Keempat modul masuk MVP, termasuk aspirasi warga.                                                                                                                                 |
| Peran                | Uraian tertulis membedakan admin dan warga; diagram membedakan Ketua RT, Pengurus RT, dan Warga.                      | Terdapat tiga peran: Ketua RT, Pengurus RT, dan Warga.                                                                                                                            |
| Kewenangan pengelola | Diagram menggambarkan beberapa aktivitas Ketua RT dan Pengurus RT secara terpisah.                                    | Ketua RT dan Pengurus RT memiliki kewenangan yang sama. Peran hanya membedakan penanda jabatan.                                                                                   |
| Pemrosesan surat     | Proposal memuat verifikasi dan penerbitan tanpa menetapkan hierarki persetujuan.                                      | Keputusan pengguna 4 November 2026 mengikuti desain: Pengajuan → Diproses → Selesai. Ketua RT dan Pengurus RT memiliki kewenangan sama; pengerjaan surat manual di luar aplikasi. |
| Akses keuangan warga | Proposal menekankan transparansi kas dan pembatasan akses data pribadi.                                               | Warga melihat riwayat iuran sendiri serta ringkasan pemasukan, pengeluaran, dan saldo kas tanpa rincian pembayaran warga lain.                                                    |
| Notifikasi           | Pengiriman notifikasi disebutkan tanpa saluran tertentu.                                                              | Notifikasi hanya di dalam aplikasi.                                                                                                                                               |
| Pendaftaran warga    | PRD awal menempatkan pendaftaran publik di luar MVP.                                                                  | Permintaan pengguna pada 2 November 2026 menambahkan register mandiri warga pada tahap awal, bersama login dan logout.                                                            |

### 1.2 Asumsi MVP

Asumsi berikut melengkapi detail operasional yang belum dijelaskan dalam proposal atau keputusan pengguna. Asumsi ini dapat direvisi melalui pembaruan PRD.

| ID    | Asumsi                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AS-01 | Login menggunakan email dan kata sandi melalui Supabase Auth. Warga dapat mendaftar mandiri; akun baru selalu berperan Warga dengan profil Menunggu Verifikasi. Pengelola tetap dapat menyiapkan akun pada tahap pengelolaan akun. Pemulihan akun mandiri melalui email berada di luar MVP. Konfirmasi email registrasi mengikuti konfigurasi Supabase.                                                                           |
| AS-02 | Data KTP/KK dicatat sebagai data terstruktur yang fiktif. Unggah hasil pindai KTP/KK bukan syarat MVP. Keterkaitan satu KK tidak memberikan akses ke data pribadi anggota keluarga lain.                                                                                                                                                                                                                                          |
| AS-03 | Warga dapat mengisi dan memperbarui data pribadinya. Perubahan memerlukan verifikasi pengelola; pengajuan surat menggunakan data yang sudah lengkap dan terverifikasi.                                                                                                                                                                                                                                                            |
| AS-04 | Delapan jenis surat mengikuti desain: Pengantar Domisili, Usaha, SKCK, Tidak Mampu, Pindah, Administrasi Kependudukan, Surat Keterangan Warga, dan Lainnya. Warga mengajukan untuk dirinya sendiri; pengerjaan dan penyerahan surat dilakukan manual. Aplikasi menyimpan referensi pengajuan unik, keperluan, kontak, keterangan, satu lampiran opsional JPG/PNG/PDF maksimal 5 MB, serta riwayat Pengajuan → Diproses → Selesai. |
| AS-05 | Keputusan 4 November 2026: iuran per warga setiap bulan; Tunai/Cash tanpa bukti atau Transfer dengan bukti privat JPG/PNG/PDF maksimal 5 MB. Warga mengirim konfirmasi, pengurus mengesahkan sebelum Lunas. Tagihan otomatis, tarif awal Rp50.000 dan jatuh tempo tanggal 10 bulan berjalan; perubahan tarif/jatuh tempo berlaku bulan berikutnya. Tanpa pembayaran daring, cicilan, prorata atau denda.                          |
| AS-06 | Saldo awal dataset uji adalah Rp0. Setiap pembayaran iuran yang disahkan menghasilkan tepat satu pemasukan kas tertaut. Pembatalan menyimpan alasan/jejak perubahan dan membatalkan pemasukan tersebut. Tahap iuran hanya mencakup pemasukan iuran; kas lengkap tetap kebutuhan lanjutan.                                                                                                                                         |
| AS-07 | Laporan berupa tampilan rekap yang dihitung dari data tersimpan dan dapat diekspor sebagai CSV oleh pengelola. PDF dapat menjadi lampiran pendukung pengajuan; aplikasi tidak menghasilkan PDF surat otomatis.                                                                                                                                                                                                                    |
| AS-08 | Antarmuka menggunakan bahasa Indonesia, nominal menggunakan Rupiah tanpa pecahan, dan waktu ditampilkan dalam WIB atau zona `Asia/Jakarta`.                                                                                                                                                                                                                                                                                       |

## 2. Latar Belakang dan Masalah

Pelayanan administrasi di tingkat RT masih sering bergantung pada catatan manual dan ketersediaan pengurus. Warga harus menyesuaikan waktu untuk meminta surat atau memperoleh informasi. Pengurus menghadapi pekerjaan berulang, kesulitan menelusuri dokumen, serta risiko kehilangan dan ketidaksesuaian data.

Pencatatan iuran dan kas secara manual menyulitkan rekonsiliasi serta penyampaian ringkasan keuangan. Aspirasi warga juga memerlukan pencatatan dan pelacakan agar tindak lanjutnya dapat diketahui pengaju.

Data kependudukan bersifat pribadi. Digitalisasi layanan harus disertai pembatasan akses berdasarkan peran dan kepemilikan data. Selama pengembangan sampai pengujian, sistem wajib menggunakan data fiktif, termasuk identitas, akun, catatan keuangan, dan dokumen surat.

## 3. Tujuan dan Ukuran Keberhasilan

### 3.1 Tujuan produk

1. Menyediakan layanan administrasi RT yang dapat diakses melalui browser tanpa instalasi aplikasi khusus.
2. Mengintegrasikan pendataan warga, pengajuan surat, pemrosesan manual, pemantauan status, riwayat, notifikasi, dan rekap laporan.
3. Menyediakan pengumuman, pencatatan iuran dan kas, serta pengelolaan aspirasi warga dalam satu aplikasi.
4. Menjaga privasi melalui RBAC dan pemeriksaan kepemilikan data pada setiap akses yang relevan.
5. Menghasilkan purwarupa yang dievaluasi melalui pengujian blackbox dan System Usability Scale (SUS).

### 3.2 Ukuran keberhasilan

Angka pada tabel berikut adalah **target penerimaan yang diusulkan dalam PRD**, bukan hasil penelitian atau angka yang tercantum dalam proposal.

| Aspek                 | Target penerimaan                                                                                                        | Cara pembuktian                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Kelengkapan fungsi    | 100% skenario kebutuhan MVP lulus; kegagalan harus diperbaiki dan diuji ulang sebelum dinyatakan selesai.                | Matriks kebutuhan, hasil blackbox, dan bukti pengujian.                     |
| Kesetaraan kewenangan | Seluruh tindakan pengelolaan memberikan kemampuan yang sama kepada Ketua RT dan Pengurus RT.                             | Menjalankan skenario yang sama menggunakan kedua peran.                     |
| Privasi               | Tidak ada akses berhasil terhadap data pribadi, surat, aspirasi, atau rincian iuran milik warga lain.                    | Pengujian lintas akun melalui antarmuka, URL langsung, dan permintaan data. |
| Akurasi keuangan      | Rekap kas sesuai dataset acuan, termasuk pembatalan transaksi dan batas periode.                                         | Perbandingan perhitungan manual dengan hasil aplikasi.                      |
| Data uji              | Seluruh data pengembangan, demo, dan pengujian adalah dummy.                                                             | Pemeriksaan seed, akun, lampiran keluaran, dan dataset uji.                 |
| Usability             | Target awal skor SUS rata-rata minimal 70 dari skala 0–100. Target ini merupakan usulan produk, bukan klaim ambang baku. | Evaluasi dengan perwakilan ketiga peran menggunakan kuesioner SUS 10 butir. |

Belum tersedia baseline waktu pelayanan, jumlah warga sasaran, jumlah peserta SUS, maupun hasil pengujian. Informasi tersebut harus dicatat dari pelaksanaan evaluasi, bukan diasumsikan sebagai hasil yang sudah tercapai.

## 4. Pengguna dan Hak Akses

### 4.1 Pengguna sasaran

| Peran       | Kebutuhan utama                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ketua RT    | Menjalankan dan memantau layanan, mengelola data dan akun, memproses surat, menangani aspirasi, serta melihat laporan.                               |
| Pengurus RT | Kebutuhan dan kewenangan yang sama dengan Ketua RT; label peran membedakan jabatan.                                                                  |
| Warga       | Mengelola data pribadi, mengajukan surat, memantau status, membaca pengumuman, melihat iuran pribadi dan ringkasan kas, serta menyampaikan aspirasi. |

Istilah **pengelola** dalam PRD ini berarti Ketua RT atau Pengurus RT. Istilah ini bukan peran tambahan di database.

### 4.2 Matriks hak akses

| Kemampuan                                               | Ketua RT                                     | Pengurus RT                                  | Warga                           |
| ------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- | ------------------------------- |
| Mengelola akun, status akun, dan penetapan peran        | Ya                                           | Ya                                           | Tidak                           |
| Melihat dan mengelola seluruh data warga                | Ya                                           | Ya                                           | Tidak                           |
| Mengisi dan memperbarui profil warga milik sendiri      | Ya, jika memiliki profil warga               | Ya, jika memiliki profil warga               | Ya, dengan verifikasi pengelola |
| Memverifikasi atau meminta perbaikan data warga         | Ya                                           | Ya                                           | Tidak                           |
| Mengajukan surat sebagai warga                          | Ya, jika memiliki profil warga terverifikasi | Ya, jika memiliki profil warga terverifikasi | Ya, untuk diri sendiri          |
| Melihat pengajuan dan dokumen surat                     | Semua                                        | Semua                                        | Milik sendiri                   |
| Memulai dan menyelesaikan pemrosesan surat              | Ya                                           | Ya                                           | Tidak                           |
| Mengelola pengumuman                                    | Ya                                           | Ya                                           | Tidak                           |
| Membaca pengumuman terbit                               | Ya                                           | Ya                                           | Ya                              |
| Mengirim konfirmasi pembayaran iuran sendiri            | Ya                                           | Ya                                           | Ya                              |
| Mengesahkan atau membatalkan iuran dan transaksi kas    | Ya                                           | Ya                                           | Tidak                           |
| Melihat rincian pembayaran iuran                        | Semua                                        | Semua                                        | Milik sendiri                   |
| Melihat rincian transaksi kas dan laporan lengkap       | Ya                                           | Ya                                           | Tidak                           |
| Melihat ringkasan pemasukan, pengeluaran, dan saldo kas | Ya                                           | Ya                                           | Ya                              |
| Mengajukan aspirasi sebagai warga                       | Ya, jika memiliki profil warga               | Ya, jika memiliki profil warga               | Ya                              |
| Melihat detail aspirasi                                 | Semua                                        | Semua                                        | Milik sendiri                   |
| Memverifikasi dan menindaklanjuti aspirasi              | Ya                                           | Ya                                           | Tidak                           |
| Melihat dan mengekspor laporan pengelolaan              | Ya                                           | Ya                                           | Tidak                           |
| Membaca atau menandai notifikasi pribadi                | Milik sendiri                                | Milik sendiri                                | Milik sendiri                   |

Warga tidak boleh mengubah peran, menetapkan status verifikasi, atau memilih pemilik lain melalui manipulasi formulir maupun permintaan data. Notifikasi tetap bersifat pribadi meskipun penerimanya memiliki peran pengelola.

## 5. Ruang Lingkup MVP

### 5.1 Termasuk dalam MVP

- Autentikasi, pendaftaran mandiri warga, pengelolaan akun oleh pengelola, serta tiga peran dengan dua kelompok kewenangan: pengelola dan warga.
- Pendataan warga, keterkaitan nomor KK, pemeriksaan kelengkapan, dan verifikasi data.
- Pengajuan delapan jenis surat, lampiran privat opsional, pemrosesan manual dengan status Pengajuan → Diproses → Selesai, serta riwayat status.
- Pengumuman internal RT yang dikelola pengelola dan dibaca setelah login.
- Pencatatan pembayaran iuran, pemasukan lain, pengeluaran, pembatalan transaksi, dan ringkasan kas.
- Aspirasi warga dengan kategori, verifikasi, tindak lanjut, dan status penanganan.
- Notifikasi dalam aplikasi, dashboard sesuai kewenangan, serta rekap dan ekspor laporan.

### 5.2 Di luar MVP

- Integrasi Dukcapil atau sistem pemerintah lainnya.
- Pengelolaan banyak RT dalam satu instalasi dan layanan untuk pengguna umum tanpa login.
- Pendaftaran mandiri peran pengelola dan pemulihan akun mandiri melalui email.
- Pembayaran daring, integrasi bank, rekonsiliasi otomatis, cicilan, denda dan perhitungan tunggakan. Tagihan iuran bulanan otomatis serta unggah bukti transfer termasuk keputusan fitur terbaru.
- Notifikasi WhatsApp, SMS, email, atau push notification perangkat.
- Tanda tangan elektronik tersertifikasi, validasi legal dokumen, dan proses pengesahan eksternal.
- Aplikasi Android/iOS native, operasi offline, dan chatbot.
- Forum aspirasi publik, pengaduan anonim, unggahan bukti aspirasi, serta unggah pindai KTP/KK.
- Penerbitan PDF surat otomatis, perbaikan/pembatalan/penolakan pengajuan surat, serta laporan analitik lanjutan.

## 6. Kebutuhan Fungsional

Seluruh kebutuhan pada bagian ini wajib tersedia dalam MVP. Setiap ID menjadi rujukan untuk implementasi dan pengujian.

### 6.1 Autentikasi dan akun

| ID      | Kebutuhan                                                                                 | Kriteria penerimaan                                                                                                                                                                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-01 | Pengguna aktif dapat login dan logout.                                                    | Kredensial valid membuka halaman sesuai peran. Kredensial tidak valid ditolak tanpa membocorkan data akun. Setelah logout, halaman dan data terlindungi tidak dapat diakses dengan sesi sebelumnya.                                                                       |
| AUTH-02 | Pengelola dapat membuat akun, menetapkan peran, dan mengaktifkan atau menonaktifkan akun. | Ketua RT dan Pengurus RT dapat menjalankan tindakan yang sama. Warga tidak dapat menjalankan tindakan tersebut. Akun nonaktif kehilangan akses layanan terlindungi, termasuk bila sebelumnya sudah login.                                                                 |
| AUTH-03 | Sistem menerapkan pemeriksaan peran dan kepemilikan data.                                 | Permintaan tanpa autentikasi atau tanpa kewenangan ditolak pada lapisan akses data/server; menyembunyikan menu saja tidak dianggap memenuhi kebutuhan.                                                                                                                    |
| AUTH-04 | Akun warga ditautkan ke profil yang sesuai.                                               | Akun warga tidak dapat membaca atau memperbarui profil orang lain dengan mengganti ID. Perubahan penautan hanya dilakukan pengelola.                                                                                                                                      |
| AUTH-05 | Warga dapat melakukan pendaftaran mandiri.                                                | Nama, email, NIK dummy, nomor HP dummy, alamat dummy, password minimal 8 karakter, dan konfirmasi wajib valid. Akun dan profil dibuat atomik; NIK duplikat ditolak. Peran/status tidak dapat dipilih melalui metadata warga. Profil awal Menunggu Verifikasi. |

### 6.2 Pendataan warga

| ID     | Kebutuhan                                                                             | Kriteria penerimaan                                                                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RES-01 | Pengelola dapat menambah, melihat, memperbarui, mencari, dan mengarsipkan data warga. | Pencarian berdasarkan nama atau identitas uji menghasilkan data yang sesuai. Data tidak lengkap ditolak dengan penjelasan kolom bermasalah. Pengarsipan tidak menghapus riwayat layanan atau keuangan.                                   |
| RES-02 | Warga dapat mengisi dan memperbarui data pribadinya.                                  | Formulir hanya menyimpan perubahan pada profil pemilik sesi. Perubahan tersimpan dengan status Menunggu Verifikasi dan tidak langsung dianggap terverifikasi.                                                                            |
| RES-03 | Pengelola dapat memverifikasi data atau meminta perbaikan.                            | Verifikasi mengubah status menjadi Terverifikasi. Permintaan perbaikan mewajibkan alasan yang dapat dilihat pemilik data. Identitas pemeriksa dan waktu tindakan tercatat.                                                               |
| RES-04 | Data identitas memiliki validasi kelengkapan dan konsistensi.                         | Nama, NIK dummy, nomor KK dummy, dan alamat wajib diisi. NIK dummy tidak boleh digunakan untuk dua profil berbeda; nomor KK dapat sama untuk anggota satu keluarga. Keterkaitan KK tidak membuka akses profil anggota lain kepada warga. |
| RES-05 | Pengelola dapat memantau progres pendataan.                                           | Rekap menampilkan jumlah data menurut status verifikasi dan dapat ditelusuri ke daftar warga terkait. Rekap tersebut tidak tersedia bagi warga lain.                                                                                     |

### 6.3 Pengajuan surat

Keputusan 4 November 2026 menggantikan alur surat pada PRD sebelumnya. Pemrosesan dan penyerahan dokumen dilakukan manual di luar aplikasi.

| ID     | Kebutuhan                                          | Kriteria penerimaan                                                                                                                                                                                                                  |
| ------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LET-01 | Warga mengajukan surat untuk diri sendiri.         | Akun aktif, tidak diarsipkan, profil lengkap dan terverifikasi, jenis surat serta keperluan valid. Pemohon dan identitas berasal dari sesi/server; status awal Pengajuan.                                                            |
| LET-02 | Warga melihat daftar, detail, dan riwayat sendiri. | Pencarian, filter, pagination empat baris, waktu WIB, serta riwayat pelaku dan status. Akses pengajuan warga lain ditolak, termasuk sesama KK.                                                                                       |
| LET-03 | Pengelola memulai dan menyelesaikan pemrosesan.    | Kedua peran pengelola setara: Pengajuan → Diproses melalui Mulai Proses; Diproses → Selesai melalui Selesai Diproses. Lompatan, kemunduran, dan perubahan versi basi ditolak.                                                        |
| LET-04 | Pengajuan yang terkirim tidak dapat diedit warga.  | Identitas, keperluan, kontak, keterangan, dan lampiran dibaca saja; tidak ada pembatalan, penolakan, atau perbaikan pengajuan dalam tahap ini.                                                                                       |
| LET-05 | Pengelola memantau seluruh pengajuan.              | Ringkasan total dan tiga status, pencarian nama/jenis/referensi, filter jenis/status, urutan terbaru/terlama, serta daftar pengajuan belum diproses. Pengelola juga dapat mengajukan surat pribadi.                                  |
| LET-06 | Lampiran dan pengiriman ulang aman.                | Satu JPG/PNG/PDF opsional, maksimal 5 MB; bucket privat, hanya pemohon/pengelola aktif dapat mengunduh. Berkas terikat tidak dapat ditimpa/dihapus browser. Percobaan ulang identik menghasilkan satu pengajuan dan satu event awal. |
| LET-07 | Pengajuan menyimpan salinan identitas.             | Perubahan profil berikutnya tidak mengubah salinan pada pengajuan. Referensi SRT-… adalah nomor pengajuan, bukan nomor penerbitan dokumen legal.                                                                                     |

### 6.4 Pengumuman

| ID     | Kebutuhan                                                                          | Kriteria penerimaan                                                                                                                                                                                                                                                                                                                                                 |
| ------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ANN-01 | Pengelola dapat membuat, mengubah, mengarsipkan, dan menayangkan ulang pengumuman. | Judul maksimal 200 karakter, deskripsi maksimal 2.000 karakter, serta waktu mulai dan selesai WIB wajib. Simpan langsung mengikuti jadwal. Kedua pengelola dapat mengedit seluruh pengumuman, mengarsipkan dengan konfirmasi, dan menayangkan ulang setelah memeriksa isi serta jadwal.                                                                             |
| ANN-02 | Pengguna aktif dapat membaca pengumuman terbit.                                    | Semua role aktif nonarsip, termasuk profil belum terverifikasi, membaca pengumuman dengan mulai ≤ waktu server < selesai dan belum diarsipkan. Beranda memuat tiga terbaru di atas profil serta Lihat semua. Daftar aktif empat kartu per halaman, urut mulai terbaru lalu ID. Pengumuman terjadwal, selesai, dan arsip tidak dapat dibaca melalui URL/API pembaca. |
| ANN-03 | Pengumuman mendukung penyampaian informasi pendataan dan layanan RT.               | Pengelola dapat menerbitkan informasi kelengkapan data, jadwal layanan, atau kegiatan tanpa membuat modul tambahan.                                                                                                                                                                                                                                                 |

### 6.5 Iuran dan kas

| ID     | Kebutuhan                                                            | Kriteria penerimaan                                                                                                                                                                                                                                                                   |
| ------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FIN-01 | Warga mengirim konfirmasi iuran bulanan dan pengelola mengesahkan.   | Satu tagihan per warga/periode, nominal dari tarif global, tanggal pembayaran dan metode. Tunai/Cash tanpa lampiran; Transfer wajib bukti privat JPG/PNG/PDF maksimal 5 MB. Status Menunggu Verifikasi belum menghasilkan kas. Persetujuan menghasilkan tepat satu pemasukan tertaut. |
| FIN-02 | Pengelola dapat mencatat pemasukan selain iuran dan pengeluaran.     | Transaksi memuat jenis, tanggal, kategori/keperluan, nominal positif, keterangan, dan pencatat. Nilai kosong, nol, atau negatif ditolak. Warga tidak dapat menulis transaksi.                                                                                                         |
| FIN-03 | Warga dapat melihat riwayat iurannya sendiri.                        | Riwayat menampilkan tanggal, periode, keperluan, nominal, dan status catatan. Pembayaran warga lain tidak tersedia melalui tabel, ekspor, ataupun permintaan data langsung. Tidak ada label tunggakan yang dihitung otomatis.                                                         |
| FIN-04 | Semua pengguna aktif dapat melihat ringkasan kas.                    | Ringkasan memuat pemasukan dan pengeluaran periode serta saldo kas. Tampilan warga tidak memuat nama pembayar, rincian pembayaran warga lain, atau detail transaksi individual kas.                                                                                                   |
| FIN-05 | Pengelola dapat melihat rincian transaksi dan melakukan penyaringan. | Filter periode dan jenis transaksi menghasilkan daftar serta total yang konsisten. Pemasukan dari iuran dapat ditelusuri ke pembayaran sumbernya oleh pengelola.                                                                                                                      |
| FIN-06 | Pengelola dapat membatalkan catatan yang salah dengan alasan.        | Catatan asli, alasan, pelaku, dan waktu pembatalan tetap tersimpan. Pembatalan pembayaran iuran sekaligus membatalkan kontribusi pemasukan kas tertaut. Pembatalan berulang tidak mengubah saldo kembali. Koreksi dicatat sebagai catatan pengganti.                                  |
| FIN-07 | Sistem menghitung saldo dan mencegah penghitungan ganda.             | Saldo mengikuti rumus pada Bagian 8. Pengulangan penyimpanan pembayaran yang sama tidak menghasilkan pemasukan tambahan. Transaksi batal tidak masuk perhitungan aktif.                                                                                                               |

### 6.6 Aspirasi warga

| ID     | Kebutuhan                                                                    | Kriteria penerimaan                                                                                                                                                                   |
| ------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ASP-01 | Warga dapat mengajukan aspirasi untuk lingkungan RT.                         | Judul, deskripsi, dan kategori wajib diisi. Pilihan kategori adalah Fasilitas Umum, Keamanan, serta Kebersihan dan Sampah. Identitas pengaju berasal dari sesi; status awal Diajukan. |
| ASP-02 | Warga dapat melihat aspirasi dan status miliknya sendiri.                    | Daftar, detail, riwayat status, dan hasil penanganan hanya tersedia bagi pengaju dan pengelola. Tidak ada daftar aspirasi publik yang membuka identitas warga lain.                   |
| ASP-03 | Pengelola dapat memverifikasi, mengategorikan, dan menindaklanjuti aspirasi. | Kedua peran pengelola dapat melihat seluruh aspirasi, mengubah kategori jika diperlukan, serta memperbarui status sesuai alur. Setiap tindakan tercatat beserta pelaku dan waktunya.  |
| ASP-04 | Penyelesaian dan penolakan memiliki penjelasan.                              | Status Selesai mensyaratkan catatan hasil penanganan. Status Ditolak mensyaratkan alasan. Penjelasan dapat dibaca pemilik aspirasi.                                                   |
| ASP-05 | Pengelola dapat memantau rekap aspirasi.                                     | Filter kategori, status, dan periode menghasilkan daftar serta jumlah yang sesuai. Rekap lengkap hanya tersedia bagi pengelola.                                                       |

### 6.7 Notifikasi dalam aplikasi

| ID     | Kebutuhan                                                                 | Kriteria penerimaan                                                                                                                                                                                                                                                                                          |
| ------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NOT-01 | Sistem memberi notifikasi kepada penerima yang relevan.                   | Warga menerima hasil verifikasi data, perubahan status surat/aspirasi, serta pencatatan atau pembatalan iurannya. Kedua peran pengelola menerima pemberitahuan data yang menunggu verifikasi, pengajuan surat baru, dan aspirasi baru. Pengumuman yang diterbitkan memberi notifikasi kepada pengguna aktif. |
| NOT-02 | Pengguna dapat membuka dan menandai notifikasi pribadinya sebagai dibaca. | Jumlah belum dibaca sesuai catatan penerima. Tautan membuka objek yang sesuai setelah pemeriksaan akses ulang. Pengguna tidak dapat membaca atau mengubah notifikasi akun lain.                                                                                                                              |
| NOT-03 | Notifikasi tidak menjadi satu-satunya sumber status layanan.              | Status terbaru tetap dapat dilihat dari detail layanan bila daftar notifikasi gagal dimuat. Isi notifikasi tidak memuat NIK, nomor KK, atau rincian pribadi yang tidak diperlukan.                                                                                                                           |

### 6.8 Dashboard dan laporan

| ID     | Kebutuhan                                           | Kriteria penerimaan                                                                                                                                                                                                                                      |
| ------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RPT-01 | Pengelola memiliki dashboard operasional.           | Dashboard menampilkan progres pendataan, jumlah pengajuan surat menurut status, ringkasan kas, dan aspirasi yang memerlukan penanganan. Angka berasal dari data tersimpan dan dapat ditelusuri ke daftar terkait.                                        |
| RPT-02 | Warga memiliki beranda sesuai hak akses.            | Beranda menampilkan status data pribadi, pengajuan surat sendiri, aspirasi sendiri, pengumuman terbit, ringkasan kas, serta akses ke iuran pribadi. Tidak ada indikator yang membuka detail warga lain.                                                  |
| RPT-03 | Pengelola dapat membuat rekap berdasarkan filter.   | Tersedia rekap pendataan menurut status, surat menurut periode dan status, kas menurut periode, serta aspirasi menurut periode, kategori, dan status. Periode surat/aspirasi mengacu pada tanggal pengajuan; periode kas mengacu pada tanggal transaksi. |
| RPT-04 | Pengelola dapat mengekspor hasil rekap sebagai CSV. | Isi ekspor mengikuti filter dan hak akses yang sama dengan tampilan. Nilai keuangan sesuai perhitungan kas. Warga tidak dapat memanggil ekspor pengelolaan melalui URL atau permintaan langsung.                                                         |

## 7. Alur Proses dan Status

### 7.1 Pendataan warga

1. Pengelola menyiapkan akun dan menautkannya ke profil warga dummy.
2. Warga melengkapi atau memperbarui data sendiri, atau pengelola membantu melakukan pendataan.
3. Data yang diajukan untuk diperiksa berstatus **Menunggu Verifikasi**.
4. Pengelola menetapkan **Terverifikasi**, atau **Perlu Perbaikan** dengan alasan.
5. Warga memperbaiki dan mengirim ulang data; status kembali menjadi Menunggu Verifikasi.
6. Perubahan pada data yang sudah terverifikasi memerlukan verifikasi ulang. Pengajuan surat yang sudah terkirim tetap menggunakan salinan identitas saat pengajuan.

### 7.2 Pengajuan surat

| Status saat ini     | Tindakan dan pelaku                                                           | Status berikutnya |
| ------------------- | ----------------------------------------------------------------------------- | ----------------- |
| Belum ada pengajuan | Pemilik profil lengkap dan terverifikasi mengirim pengajuan.                  | Pengajuan         |
| Pengajuan           | Ketua RT atau Pengurus RT memilih Mulai Proses.                               | Diproses          |
| Diproses            | Ketua RT atau Pengurus RT memilih Selesai Diproses setelah pengerjaan manual. | Selesai           |

Masih Diproses menutup dialog tanpa mengubah status. Selesai merupakan status akhir. Pengajuan yang terkirim tidak dapat diedit warga. Kedua peran pengelola mempunyai kewenangan identik; tidak ada tahap persetujuan berjenjang atau PDF otomatis. Riwayat mencatat status sebelumnya/berikutnya, pelaku, jabatan saat tindakan, dan waktu.

### 7.3 Pengumuman

Keputusan pengguna 5 November 2026: pengumuman disimpan langsung dengan tanggal/jam mulai dan selesai dalam WIB, tanpa draf atau persetujuan tambahan. Status **Terjadwal**, **Sedang tayang**, dan **Selesai** dihitung dari waktu server; **Diarsipkan** mengesampingkan jadwal. Mulai inklusif, selesai eksklusif. Waktu selesai harus setelah mulai; pembuatan dan tayangkan ulang juga mensyaratkan waktu selesai masih di masa depan. Waktu mulai boleh sudah lewat agar langsung tayang. Edit langsung berlaku, termasuk penjadwalan ulang pengumuman selesai. Arsip menyimpan data; tayangkan ulang menyimpan perubahan isi/jadwal dan melepas arsip dalam satu transaksi. Timer batas jadwal, polling 60 detik, serta pembacaan ulang saat fokus memperbarui antarmuka tanpa cron. Pengumuman teks tahap ini belum mengimplementasikan notifikasi NOT-01.

### 7.4 Iuran dan kas

1. Sistem menerbitkan satu tagihan per profil aktif nonarsip per bulan. Akun lama mulai bulan fitur aktif; akun baru mulai bulan aktif dengan tarif penuh. Warga mengirim konfirmasi Tunai/Cash atau Transfer; hanya Transfer memerlukan bukti.
2. Pengurus memeriksa penerimaan uang dan menyetujui atau menolak dengan alasan. Persetujuan mengubah status menjadi Lunas dan menghasilkan satu pemasukan kas tertaut secara atomik. Konfirmasi yang masih menunggu verifikasi belum menghasilkan kas; penolakan memungkinkan pengiriman ulang.
3. Pengelola mencatat pemasukan lain atau pengeluaran secara terpisah.
4. Ringkasan serta laporan dihitung dari transaksi aktif.
5. Jika terdapat kesalahan, pengelola membatalkan dengan alasan dan mencatat pengganti bila diperlukan. Pembatalan iuran turut membatalkan pemasukan tertaut.

Status tagihan adalah **Belum Bayar → Menunggu Verifikasi → Lunas**. Status konfirmasi adalah Diajukan, Disetujui, Ditolak atau Dibatalkan. Status catatan kas adalah **Tercatat** atau **Dibatalkan**. Catatan yang sudah tersimpan tidak dihapus atau ditimpa untuk menghilangkan riwayatnya. Rincian implementasi tahap iuran dan batas kas lengkap ada di `docs/monthly-dues.md`.

### 7.5 Aspirasi warga

| Status saat ini        | Tindakan dan pelaku                                | Status berikutnya |
| ---------------------- | -------------------------------------------------- | ----------------- |
| Belum ada aspirasi     | Warga mengisi dan mengirim aspirasi.               | Diajukan          |
| Diajukan               | Pengelola memverifikasi dan memulai tindak lanjut. | Diproses          |
| Diajukan atau Diproses | Pengelola menolak dengan alasan.                   | Ditolak           |
| Diproses               | Pengelola mencatat hasil penanganan.               | Selesai           |

Selesai dan Ditolak merupakan status akhir. Aspirasi yang telah dikirim tidak diedit oleh warga pada MVP; kebutuhan tambahan disampaikan melalui pengajuan baru. Catatan tindak lanjut dapat dibaca pengaju tanpa membuka data aspirasi orang lain.

## 8. Aturan Bisnis dan Data

### 8.1 Aturan umum

- Sistem melayani satu RT. Identitas RT dalam purwarupa memakai konfigurasi dummy.
- Setiap akun memiliki satu peran aktif. Ketua RT dan Pengurus RT dipetakan ke kumpulan izin pengelola yang identik.
- Profil warga menyimpan data pribadi; kepemilikan ditentukan dari relasi akun yang tervalidasi, bukan dari parameter permintaan pengguna.
- Akses warga terhadap satu KK tidak berarti akses terhadap profil anggota KK lainnya.
- Warga yang diarsipkan tidak dapat membuat pengajuan baru; akun terkait dinonaktifkan, sedangkan riwayat tetap tersimpan untuk pengelola.
- Data wajib divalidasi saat penulisan di lapisan tepercaya. Validasi formulir di browser tetap diperlukan untuk membantu pengguna.
- Riwayat status mencatat objek, status sebelumnya, status baru, pelaku, waktu, dan alasan/catatan jika diperlukan.

### 8.2 Perhitungan keuangan

Seluruh nominal disimpan sebagai nilai numerik Rupiah tanpa pecahan. Label periode iuran membedakan tujuan pembayaran; perhitungan arus kas mengikuti tanggal transaksi, bukan label periode iuran.

```text
Saldo pada suatu waktu
  = total pemasukan aktif sampai waktu tersebut
  - total pengeluaran aktif sampai waktu tersebut

Saldo awal periode
  = total pemasukan aktif sebelum awal periode
  - total pengeluaran aktif sebelum awal periode

Saldo akhir periode
  = saldo awal periode
  + pemasukan aktif selama periode
  - pengeluaran aktif selama periode
```

Transaksi Dibatalkan tidak dihitung. Pembayaran iuran tidak dijumlahkan kembali di luar pemasukan kas tertaut. Pada tampilan periode, saldo akhir tidak boleh dihitung hanya sebagai selisih pemasukan dan pengeluaran periode tanpa membawa saldo awal.

### 8.3 Entitas konseptual

Tabel ini menjelaskan kebutuhan informasi, bukan skema SQL atau kontrak API final.

| Entitas            | Informasi utama                                                                                           | Relasi dan pembatasan                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Akun               | Identitas autentikasi, email dummy, peran, status aktif                                                   | Dapat ditautkan ke satu profil warga; kredensial dikelola layanan autentikasi.                  |
| Profil warga       | Nama dummy, NIK dummy, nomor KK dummy, alamat dummy, tanggal lahir dummy, status verifikasi, status arsip | Satu profil dapat ditautkan ke satu akun; warga hanya mengakses profil sendiri.                 |
| Kelompok KK        | Nomor KK dummy dan keterkaitan anggota                                                                    | Digunakan untuk pendataan pengelola; bukan sumber izin melihat anggota keluarga.                |
| Pengajuan surat    | Pemohon, keperluan, salinan identitas, status, waktu pengajuan, catatan pemeriksaan                       | Terhubung ke warga dan riwayat status; warga hanya melihat miliknya.                            |
| Lampiran pengajuan | Pengajuan, nama berkas, tipe, ukuran, lokasi privat                                                       | Opsional, satu berkas JPG/PNG/PDF maksimal 5 MB; diakses pemohon dan pengelola.                 |
| Pengumuman         | Judul, deskripsi, mulai/selesai tayang, pembuat/pengubah, waktu arsip                                     | Pengguna aktif membaca pengumuman dalam rentang tayang; pengelola dapat membaca seluruh status. |
| Pembayaran iuran   | Warga, keperluan, periode, nominal, tanggal, status, pencatat                                             | Memiliki satu transaksi pemasukan kas tertaut.                                                  |
| Transaksi kas      | Jenis pemasukan/pengeluaran, kategori, nominal, tanggal, keterangan, status, sumber, pencatat             | Detail hanya untuk pengelola; agregat tertentu tersedia bagi warga.                             |
| Aspirasi           | Pengaju, judul, deskripsi, kategori, status, catatan hasil                                                | Terhubung ke riwayat penanganan; hanya pengaju dan pengelola melihat detail.                    |
| Notifikasi         | Penerima, jenis kejadian, ringkasan, objek tujuan, waktu, status baca                                     | Hanya penerima dapat membaca dan menandai notifikasi.                                           |
| Riwayat perubahan  | Objek, tindakan, pelaku, waktu, status/alasan yang relevan                                                | Menjaga jejak perubahan status layanan, verifikasi profil, serta pembatalan keuangan.           |

## 9. Kebutuhan Antarmuka

### 9.1 Halaman utama

| Area      | Halaman dan informasi                                                                                                                                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bersama   | Login, register warga, konfirmasi akun, pengumuman dan detail, ringkasan kas, serta notifikasi pribadi.                                                                                                                                 |
| Pengelola | Dashboard operasional; akun dan peran; daftar/detail warga dan verifikasi; daftar/detail pengajuan surat dan pemrosesan manual; pengelolaan pengumuman; pembayaran iuran; transaksi kas; aspirasi dan penanganan; laporan serta ekspor. |
| Warga     | Beranda; profil dan status verifikasi; pengajuan/detail/riwayat surat; unduh lampiran pengajuan sendiri; riwayat iuran sendiri; pengajuan/detail/riwayat aspirasi sendiri.                                                              |

Jika akun pengelola memiliki profil warga, akun tersebut juga dapat membuka layanan pribadi untuk dirinya sendiri. Hal ini tidak mengurangi akses pengelola terhadap data operasional.

### 9.2 Perilaku antarmuka

- Tampilan dapat digunakan pada browser ponsel dan desktop; lebar 360 px, 768 px, dan 1280 px menjadi ukuran pemeriksaan responsif.
- Formulir memiliki label, penanda kolom wajib, dan pesan kesalahan yang menjelaskan perbaikan yang diperlukan.
- Status menggunakan teks yang jelas dan tidak dibedakan dengan warna saja.
- Daftar data menyediakan keadaan memuat, kosong, gagal, dan berhasil. Daftar besar memakai pagination atau pemuatan bertahap.
- Kesalahan jaringan mempertahankan input formulir yang belum tersimpan dan menyediakan percobaan ulang yang aman.
- Tindakan penolakan, pengarsipan, penonaktifan akun, dan pembatalan keuangan menampilkan konfirmasi yang menyebut objek tindakan. Penolakan dan pembatalan mewajibkan alasan.
- Pengguna tanpa izin memperoleh pesan akses ditolak yang tidak membuka isi data. Sistem tidak menampilkan detail teknis internal atau kredensial.

## 10. Kebutuhan Nonfungsional

| ID     | Area                    | Kebutuhan dan penerimaan                                                                                                                                                                                                                                                                                                        |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Otorisasi               | Pemeriksaan sesi, status akun, peran, dan kepemilikan berlaku pada setiap operasi terlindungi. Akses data Supabase dilindungi Row Level Security (RLS) atau lapisan server yang setara; konfigurasi tidak boleh membuka akses lintas warga.                                                                                     |
| NFR-02 | Kerahasiaan             | Lampiran pengajuan surat disimpan secara privat. Rahasia server dan kunci berhak istimewa tidak disertakan dalam kode browser. Kata sandi tidak disimpan sebagai teks biasa dalam tabel aplikasi, log, atau laporan.                                                                                                            |
| NFR-03 | Pemisahan data          | Lingkungan pengembangan dan pengujian menggunakan akun, identitas, transaksi, dan keluaran dummy. Data asli tidak diimpor sebagai seed atau contoh.                                                                                                                                                                             |
| NFR-04 | Integritas              | Penyimpanan iuran dan pemasukan tertaut serta pembatalannya bersifat konsisten. Aksi berulang tidak menggandakan transaksi, pengajuan surat, atau riwayat perubahan status. Penanganan kegagalan tidak menampilkan keberhasilan sebelum data utama tersimpan.                                                                   |
| NFR-05 | Keterlacakan            | Verifikasi profil, perubahan status layanan, perubahan peran/status akun, dan pembatalan keuangan mencatat pelaku serta waktu. Riwayat tidak dapat diubah oleh warga.                                                                                                                                                           |
| NFR-06 | Kemudahan penggunaan    | Alur inti dapat dijalankan melalui browser, navigasi keyboard dasar dapat digunakan, label formulir terbaca, dan status/kesalahan memiliki penjelasan teks.                                                                                                                                                                     |
| NFR-07 | Kinerja                 | Daftar menggunakan pagination atau pembatasan hasil. Ringkasan dihitung dari data yang relevan tanpa mengirim seluruh detail warga ke browser warga. Waktu respons diukur dan dilaporkan selama evaluasi; proposal belum menetapkan SLA numerik.                                                                                |
| NFR-08 | Pemulihan dan kegagalan | Input yang gagal disimpan dapat dicoba ulang. Kegagalan unggah/finalisasi tidak menampilkan pengajuan berhasil; percobaan ulang menggunakan ID permintaan yang sama. Kegagalan pemuatan notifikasi tidak menutup akses ke status layanan. Prosedur pencadangan dan pemulihan dataset dummy didokumentasikan sebelum demo akhir. |

## 11. Batasan Teknologi dan Arsitektur

Teknologi berikut mengikuti proposal, bukan hasil pemilihan stack baru dalam PRD.

| Komponen             | Teknologi dan tanggung jawab                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bahasa               | TypeScript untuk aplikasi, logika layanan, dan tipe interaksi data.                                                                              |
| Aplikasi web         | React dengan Vite sebagai build tool; React Router v7 untuk navigasi halaman. Pemilihan Vite mengikuti permintaan pengguna pada 2 November 2026. |
| Antarmuka            | HTML dan Tailwind CSS untuk struktur dan tampilan responsif.                                                                                     |
| Backend dan database | Supabase dengan PostgreSQL untuk penyimpanan data; Supabase Auth untuk autentikasi sesuai AS-01.                                                 |
| Penyimpanan dokumen  | Supabase Storage privat untuk lampiran pengajuan, dengan pemeriksaan akses berdasarkan pemohon atau kewenangan pengelola.                        |
| Hosting              | Vercel untuk deployment aplikasi web dan akses melalui HTTPS.                                                                                    |

Alur konseptual: pengguna mengakses aplikasi melalui browser, aplikasi memvalidasi sesi dan kewenangan pada lapisan tepercaya, kemudian membaca atau menulis data yang diizinkan. Dokumen hanya disajikan setelah pemeriksaan akses. Rekap warga mengambil hasil agregat yang diizinkan tanpa membuka transaksi individual warga lain.

Detail endpoint, skema fisik, adapter deployment, dan konfigurasi CI/CD dibuat pada tahap desain teknis. PRD ini tidak membuat atau mengubah API, database, maupun infrastruktur.

## 12. Pengujian dan Kriteria Penerimaan

### 12.1 Dataset dan pendekatan

- Gunakan akun dummy untuk ketiga peran, termasuk minimal dua akun warga berbeda untuk menguji kepemilikan data.
- Siapkan data untuk seluruh status pendataan, surat, aspirasi, dan catatan keuangan; sertakan kondisi tanpa data serta transaksi lintas periode.
- Jalankan pengujian blackbox berdasarkan input, tindakan pengguna, dan hasil yang dapat diamati.
- Uji otorisasi melalui antarmuka, URL langsung, serta permintaan data. Pengujian menu saja tidak cukup.
- Catat skenario, data uji, hasil yang diharapkan, hasil aktual, bukti, status lulus/gagal, dan tindak lanjut. Dokumen ini belum berisi hasil aktual.

### 12.2 Skenario penerimaan utama

| ID uji | Kebutuhan terkait                      | Skenario dan hasil yang diharapkan                                                                                                                                                                                                                                                      |
| ------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UAT-01 | AUTH-01, AUTH-02                       | Login valid berhasil; kredensial salah dan akun nonaktif ditolak; logout menghentikan akses terlindungi.                                                                                                                                                                                |
| UAT-02 | AUTH-02, AUTH-03, NFR-05               | Jalankan pengelolaan akun dengan Ketua RT dan Pengurus RT. Keduanya memiliki tindakan identik dan perubahan tercatat; warga ditolak.                                                                                                                                                    |
| UAT-03 | AUTH-03, AUTH-04, RES-04               | Warga A mencoba membaca atau menulis profil Warga B, termasuk anggota KK yang sama. Semua akses tersebut ditolak.                                                                                                                                                                       |
| UAT-04 | RES-01, RES-02, RES-03, RES-04, RES-05 | Data tidak lengkap atau NIK dummy duplikat ditolak; data lengkap melewati verifikasi/perbaikan; perubahan profil memerlukan verifikasi ulang; rekap status sesuai.                                                                                                                      |
| UAT-05 | LET-01, LET-02, LET-03, LET-04         | Warga terverifikasi mengirim pengajuan; pengurus memulai dan menyelesaikannya. Tiga status dan riwayat terlihat oleh pemohon. Pengajuan terkirim tidak dapat diedit.                                                                                                                    |
| UAT-06 | LET-03, LET-05, LET-06                 | Kedua peran pengelola menjalankan tindakan yang sama. Percobaan ulang tidak menggandakan pengajuan/event; konflik versi meminta pemuatan ulang.                                                                                                                                         |
| UAT-07 | LET-02, LET-06, LET-07, NFR-02         | Warga A tidak dapat membaca pengajuan atau lampiran Warga B. Salinan identitas tetap sama setelah profil diperbarui.                                                                                                                                                                    |
| UAT-08 | LET-01, LET-03, LET-06, NFR-08         | Profil belum terverifikasi, lampiran tidak valid, lompatan/kemunduran status ditolak. Kegagalan unggah/simpan mempertahankan formulir dan dapat dicoba ulang.                                                                                                                           |
| UAT-09 | ANN-01, ANN-02, ANN-03                 | Kedua pengelola membuat, mengedit, mengarsipkan, dan menayangkan ulang. Semua role membaca yang sedang tayang. Uji tepat mulai/akhir, WIB, tiga kartu Beranda, pagination, konflik versi, percobaan ulang, serta penolakan akses URL/API pada pengumuman terjadwal, selesai, dan arsip. |
| UAT-10 | FIN-01, FIN-02, FIN-07, NFR-04         | Satu pembayaran iuran membuat satu pemasukan. Pengulangan simpan tidak menggandakan saldo; nominal kosong, nol, atau negatif ditolak.                                                                                                                                                   |
| UAT-11 | FIN-03, FIN-04, FIN-05                 | Warga melihat pembayaran sendiri dan ringkasan kas; rincian pembayaran orang lain serta detail kas ditolak. Pengelola dapat melihat rincian sesuai filter.                                                                                                                              |
| UAT-12 | FIN-06, FIN-07                         | Pembatalan iuran membatalkan satu pemasukan tertaut, menyimpan alasan/riwayat, dan tidak mengubah saldo lagi ketika diulangi.                                                                                                                                                           |
| UAT-13 | FIN-07, RPT-03, RPT-04                 | Dataset acuan: saldo awal bulan Rp100.000, pemasukan bulan berjalan Rp50.000, pengeluaran Rp30.000. Saldo akhir harus Rp120.000. Jika pemasukan Rp50.000 dibatalkan, saldo akhir menjadi Rp70.000. Tampilan dan CSV sama.                                                               |
| UAT-14 | ASP-01, ASP-02                         | Aspirasi baru wajib berkategori dan berdeskripsi. Warga A tidak dapat membaca aspirasi Warga B melalui daftar, detail, maupun permintaan data.                                                                                                                                          |
| UAT-15 | ASP-03, ASP-04, ASP-05                 | Kedua peran pengelola dapat memproses aspirasi. Penyelesaian memerlukan hasil; penolakan memerlukan alasan; rekap kategori/status sesuai.                                                                                                                                               |
| UAT-16 | NOT-01, NOT-02, NOT-03                 | Perubahan layanan memberi notifikasi kepada penerima relevan. Warga tidak dapat membaca notifikasi akun lain; kegagalan daftar notifikasi tidak menghilangkan status layanan.                                                                                                           |
| UAT-17 | RPT-01, RPT-02, RPT-03, RPT-04         | Dashboard dan ekspor mengikuti peran serta filter. Data kosong menampilkan keadaan kosong yang jelas, bukan angka atau baris contoh seolah-olah data asli.                                                                                                                              |
| UAT-18 | NFR-01, NFR-03, NFR-05                 | Seluruh skenario memakai data dummy; akses langsung tanpa sesi ditolak; tindakan penting memiliki pelaku dan waktu yang dapat ditelusuri.                                                                                                                                               |
| UAT-19 | NFR-06, NFR-07, NFR-08                 | Alur login, pengajuan surat, baca informasi, dan aspirasi dapat digunakan pada ukuran layar pemeriksaan. Pesan gagal jelas, input dipertahankan, dan percobaan ulang tidak menggandakan hasil.                                                                                          |

Skenario di atas merupakan cakupan minimum. Kasus rinci setiap ID kebutuhan tetap diturunkan dari kriteria penerimaannya, termasuk percobaan tindakan yang tidak diizinkan pada setiap peran.

### 12.3 Evaluasi SUS

Evaluasi dilakukan setelah peserta mencoba alur yang sesuai perannya. Peserta mencakup perwakilan Ketua RT, Pengurus RT, dan Warga, menggunakan akun serta data dummy. Jumlah peserta ditetapkan dan dilaporkan saat pelaksanaan evaluasi; proposal belum memberikan jumlahnya.

Gunakan kuesioner SUS standar 10 butir berskala Likert. Catat metode perhitungan, skor tiap peserta, skor rata-rata, kendala yang ditemukan, dan rekomendasi perbaikan. Target awal PRD adalah rata-rata minimal 70; hasil di bawah target memerlukan iterasi perbaikan dan evaluasi ulang. Tidak ada skor aktual yang diklaim dalam dokumen ini.

### 12.4 Definisi selesai MVP

- Seluruh kebutuhan fungsional MVP tersedia dan kriteria penerimaannya lulus.
- Skenario kesetaraan kewenangan pengelola dan pembatasan akses antarwarga lulus.
- Saldo, pembatalan transaksi, dan laporan sesuai dataset acuan.
- Referensi pengajuan unik, lampiran privat, urutan tiga status, dan riwayat pelaku/waktu telah diperiksa.
- Bukti blackbox dan evaluasi SUS tersedia; masalah yang menghalangi penerimaan telah diperbaiki dan diuji ulang.
- Purwarupa dapat diakses pada lingkungan deployment uji, disertai panduan penggunaan dan akun demo dummy.
- Tidak ada data penduduk asli pada aplikasi, seed, log pengujian, atau dokumen keluaran.

## 13. Tahapan Pengembangan

Tahapan mengikuti pendekatan prototype pada proposal. Tanggal, durasi, dan pembagian personel belum ditetapkan dalam sumber sehingga tidak dicantumkan sebagai komitmen.

| Tahap                       | Fokus                                                                                                         | Keluaran                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1. Validasi kebutuhan       | Meninjau PRD, asumsi, alur layanan, dan matriks akses dengan pemangku kepentingan.                            | Kebutuhan dan penyesuaian yang terdokumentasi.          |
| 2. Prototype awal           | Menyusun alur antarmuka pengelola dan warga untuk keempat modul.                                              | Prototype yang dapat dievaluasi menggunakan data dummy. |
| 3. Evaluasi prototype       | Meminta umpan balik atas kelengkapan data, alur surat, kas, dan aspirasi.                                     | Temuan usability dan revisi kebutuhan/prototype.        |
| 4. Fondasi dan administrasi | Mengimplementasikan autentikasi, akun, hak akses, pendataan, pengajuan surat, lampiran privat, serta riwayat. | Alur administrasi fungsional dengan pembatasan akses.   |
| 5. Modul pelengkap MVP      | Mengimplementasikan pengumuman, iuran/kas, aspirasi, notifikasi, dashboard, dan laporan.                      | Seluruh fungsi MVP terintegrasi.                        |
| 6. Pengujian dan iterasi    | Menjalankan blackbox, pengujian akses, perhitungan kas, dan SUS; memperbaiki temuan.                          | Bukti pengujian dan purwarupa yang memenuhi penerimaan. |
| 7. Demo dan dokumentasi     | Menyiapkan deployment uji, panduan, dataset dummy, dan laporan evaluasi.                                      | Purwarupa siap demonstrasi capstone.                    |

## 14. Risiko dan Ketergantungan

| Risiko atau ketergantungan                           | Dampak                                               | Penanganan                                                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Perbedaan narasi dan diagram proposal                | Cakupan serta peran dapat diimplementasikan berbeda. | Gunakan keputusan pada Bagian 1 sebagai acuan dan perbarui PRD saat ada perubahan.                                 |
| Kebocoran data melalui URL, ekspor, atau file PDF    | Privasi warga tidak terjaga.                         | Terapkan pemeriksaan akses pada data dan dokumen; uji lintas akun di semua jalur.                                  |
| Pencatatan iuran atau pengajuan surat ganda          | Saldo atau referensi pengajuan tidak konsisten.      | Gunakan operasi konsisten, identitas transaksi/pengajuan unik, dan skenario percobaan ulang.                       |
| Keterlambatan umpan balik pengelola atau warga       | Iterasi prototype dan evaluasi usability tertunda.   | Siapkan skenario evaluasi per peran dan catat temuan setiap sesi.                                                  |
| Ketergantungan Supabase dan Vercel                   | Gangguan atau konfigurasi dapat memengaruhi demo.    | Siapkan konfigurasi lingkungan, dataset dummy yang dapat dipulihkan, dan pemeriksaan deployment sebelum demo.      |
| Penggunaan dokumen pengujian seolah-olah surat resmi | Hasil purwarupa disalahpahami.                       | Gunakan identitas RT dummy dan berkas pendukung pengujian; penyerahan surat dilakukan manual oleh pengurus.        |
| Perluasan fitur selama capstone                      | Penyelesaian MVP tertunda.                           | Evaluasi perubahan terhadap empat modul dan kriteria penerimaan; fitur di luar MVP dicatat untuk tahap berikutnya. |

## 15. Keterlacakan ke Sumber

| Sumber                                   | Kebutuhan yang diturunkan                                                                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Proposal Bab I §1.1–1.2                  | Digitalisasi layanan, akses melalui web, pendataan, surat, pengumuman, keuangan, keamanan, dan purwarupa teruji.                                                      |
| Proposal Bab I §1.3                      | Batas lingkungan RT, alur surat sampai laporan, RBAC, larangan akses data warga lain, penggunaan data dummy, serta tanpa integrasi Dukcapil.                          |
| Proposal Bab II §2.3                     | Pembatasan hak akses berdasarkan peran.                                                                                                                               |
| Proposal Bab II §2.4                     | Pengembangan melalui pengumpulan kebutuhan, prototype, evaluasi pengguna, pengkodean, dan pengujian.                                                                  |
| Diagram use case §2.5 dan flowchart §2.6 | Pendataan KTP/KK, pemeriksaan kelengkapan, pemantauan progres, aspirasi warga, kategori aspirasi, dan tindak lanjut.                                                  |
| Proposal Bab II §2.7–2.8                 | Supabase/PostgreSQL, TypeScript, React Router v7, HTML/Tailwind CSS, dan deployment melalui Vercel.                                                                   |
| Bagian Pengujian Sistem dalam proposal   | Blackbox testing dan evaluasi pengguna dengan SUS.                                                                                                                    |
| Keputusan pengguna saat penyusunan PRD   | Aspirasi masuk MVP; tiga peran; Ketua RT dan Pengurus RT memiliki kewenangan identik; warga melihat iuran sendiri dan ringkasan kas; notifikasi hanya dalam aplikasi. |
| Asumsi MVP AS-01–AS-08                   | Detail operasional tambahan yang belum ditetapkan dalam sumber dan ditandai secara eksplisit pada dokumen ini.                                                        |

Daftar pustaka akademik pada proposal tetap menjadi bagian dari dokumen sumber. PRD ini tidak menyatakan bahwa rujukan tersebut telah diverifikasi secara independen dan tidak menambahkan klaim hasil penelitian.
