# SummaryCardView

Komponen bersama di `src/components/SummaryCardView.tsx` dipakai oleh Data
Warga, Pengajuan Surat, serta Iuran Warga untuk pengurus dan warga.
Seluruh gaya kartu dan grid berada di `src/components/SummaryCardView.tsx`, dengan
acuan kartu Data Warga: radius 14 px, padding 16 px, label 14 px, angka
24 px, dan gap 12 px. Halaman hanya memasok data dan mengatur jarak ke
bagian halaman lainnya. Semua label, tautan, angka, dan nilai status
menggunakan token `ink` dari komponen.

```tsx
<SummaryCardView
  aria-label="Ringkasan pendataan"
  aria-busy={query.isPending}
  items={[
    { id: 'total', label: 'Total warga', value: 1200 },
    { id: 'verified', label: 'Terverifikasi', value: 1100 },
  ]}
/>
```

- `items`: daftar dengan `id` stabil, `label`, dan `value`.
  Label menerima teks atau elemen tautan. Nilai berupa angka diformat
  menggunakan locale `id-ID`; nilai teks dapat berisi mata uang, status,
  atau placeholder saat memuat/gagal.
- `icon` dan `description` pada setiap item bersifat opsional. Dashboard memakai
  ikon dekoratif di sebelah label dan keterangan di bawah nilai.
- `columns`: `4` secara default; `2` untuk ringkasan iuran pribadi; `3` untuk
  dashboard admin. Susunan tiga kolom menjadi satu kolom di bawah 46rem.
- `aria-label` dan `aria-busy`: nama daftar ringkasan dan status pemuatan.

Komponen menggunakan `dl`, `dt`, dan `dd`. Grid mengikuti container halaman
yang sudah tersedia: dua kolom di bawah 46rem dan satu kolom di bawah 20rem.
Angka berpindah ke sisi akhir kartu di area sempit; nilai teks dan mata uang
tetap di bawah label agar mudah dibaca. Padding menjadi 12 px di bawah
33rem. Komponen tidak menerima prop `className` atau `style`, sehingga gaya
kartu ditentukan oleh utility pada satu komponen bersama.
