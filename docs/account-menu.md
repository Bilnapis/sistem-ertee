# Menu akun pada header

Header menampilkan avatar inisial, nama akun, role, dan chevron. Nama panjang
dipendekkan pada pemicu, lalu ditampilkan lengkap bersama email di submenu.
Tombol **Ubah data diri** membuka formulir profil sendiri dari halaman yang
sedang dibuka. Formulir memakai editor yang tersedia, tanpa kontrol role atau
status akun. Nama pada header diperbarui setelah perubahan disimpan.

Submenu mendukung Enter, Space, Tab, Shift+Tab, Escape, dan klik di luar.
Setelah dialog ditutup, fokus kembali ke tombol akun. Tombol **Keluar** memakai
alur keluar akun yang sudah tersedia.

Temuan selama verifikasi sudah diperbaiki. Lingkup pemeriksaan adalah header,
submenu akun, dan akses ke formulir profil sendiri.

**Survive zoom and text resize / Plan for growth and clipping**

| Severity      | Location                                                                                                                            | Before                                                                              | After                                                                                                                            | Why                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| HIGH, selesai | `src/components/AccountMenu.module.css:7`, `src/components/AuthenticatedLayout.module.css:247`, `src/components/AccountMenu.tsx:20` | Nama panjang dan teks 200% dapat mendorong pemicu atau submenu melewati tepi layar. | Lebar pemicu mengikuti ruang tersedia; header dapat membungkus; tinggi submenu mengikuti sisa tinggi viewport dan dapat digulir. | WCAG 1.4.4 / 1.4.10: informasi dan tindakan tetap dapat dijangkau. |

**Native elements first / Trap and restore focus**

| Severity        | Location                            | Before                                                                     | After                                                                         | Why                                                                               |
| --------------- | ----------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| HIGH, selesai   | `src/components/AccountMenu.tsx:85` | Pemicu awal tidak dikenali sebagai tombol pada accessibility tree browser. | Tombol native memiliki nama akun, role, `aria-expanded`, dan `aria-controls`. | WCAG 2.1.1 / 4.1.2: menu dapat dibuka dengan keyboard dan statusnya tersampaikan. |
| MEDIUM, selesai | `src/components/AccountMenu.tsx:58` | Fokus dapat hilang setelah membatalkan edit profil.                        | Pemulihan fokus dijalankan setelah dialog dilepas dari DOM.                   | WCAG 2.4.3: pengguna melanjutkan navigasi dari tombol akun.                       |

Verifikasi: build, lint, format, dan 32 tes browser autentikasi/profil lolos.
Tes mencakup edit profil sendiri untuk Warga, Ketua RT, dan Pengurus RT;
pembaruan nama; keyboard dan pemulihan fokus; klik di luar; serta keluar akun.
Nama panjang diperiksa pada 320, 360, 528, 768, 1024, 1440, dan 1920 px,
dalam LTR/RTL dengan ukuran teks 100% dan 200%. Pratinjau visual diperiksa
pada 320 dan 1440 px.

Not verified: pembaca layar manual, audit axe, Firefox/Safari, dan zoom browser
native. Pengujian 200% di atas memakai pembesaran ukuran teks CSS.

Approve untuk lingkup menu akun yang diperiksa.
