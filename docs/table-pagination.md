# TablePagination

Komponen bersama di `src/components/TablePagination.tsx` dipakai oleh Data
Warga, Pengajuan Surat, dan Iuran Warga, termasuk daftar pribadi dan pengurus.
Acuan tampilannya adalah tabel Data Warga: border dan radius 8 px, header
`soft` dengan teks 14 px semibold (600) dan huruf kapital di awal judul saja,
isi 14 px,
padding sel 16 × 12 px, serta tombol pagination 44 × 44 px. Teks isi,
badge, tag, teks sekunder, dan tautan aksi memakai 14 px (0.875rem).
Kolom aksi rata akhir.

Seluruh utility tabel, status memuat/gagal/kosong, petunjuk gulir, badge,
tautan aksi, dan pagination berada dalam file komponen ini. `TablePagination`,
`TableCellText`, `TableBadge`, dan `TableActionLink` tidak menerima prop
`className` atau `style`. Halaman memasok data, isi kolom, proporsi lebar,
status permintaan, dan callback; jangan menambahkan selector tabel dari
wrapper halaman atau CSS global.

```tsx
<TablePagination
  caption="Daftar warga"
  items={query.data?.items ?? []}
  getRowKey={(resident) => resident.id}
  columns={[
    {
      id: 'name',
      header: 'Warga',
      width: 70,
      rowHeader: true,
      render: (resident) => (
        <TableCellText tag={roleLabels[resident.role]}>
          {resident.full_name}
        </TableCellText>
      ),
    },
    {
      id: 'action',
      header: 'Aksi',
      width: 30,
      render: (resident) => (
        <TableActionLink
          to={`/admin/warga/${resident.id}`}
          aria-label={`Lihat ${resident.full_name}`}
        >
          Lihat
        </TableActionLink>
      ),
    },
  ]}
  pagination={{
    page: filters.page,
    pageSize: 10,
    total: query.data?.total ?? 0,
    itemLabel: 'warga',
    label: 'Halaman warga',
    onPageChange: (page) => change('page', String(page)),
  }}
  isLoading={query.isPending}
  isFetching={query.isFetching}
  error={query.isError ? residentError(query.error) : null}
  onRetry={() => void query.refetch()}
  emptyState={{ description: 'Belum ada warga yang ditampilkan.' }}
/>
```

- `columns` memakai tipe generik `TablePaginationColumn<T>`. Setiap kolom
  memiliki `id`, `header`, `width` dalam persen, dan `render(item, index)`.
  Total proporsi lebar 100. `rowHeader` menghasilkan `th scope="row"`.
  `kind: 'identity'` menjaga NIK satu baris dengan angka tabular dan warna
  muted; `kind: 'number'` memakai angka tabular.
- `pagination` dikontrol halaman melalui URL. Komponen menghitung jumlah
  halaman dan rentang dari baris yang diterima, tanpa memotong ulang data
  server. Data Warga dan Iuran memakai 10 baris; Pengajuan Surat memakai 4.
  Tombol dinonaktifkan pada batas halaman dan selama pengambilan data.
  Hasil kosong menampilkan `0–0`, dengan minimal satu halaman.
- `loadingMessage`, `error`, `onRetry`, dan `retryLabel` mengatur pesan
  pemuatan serta percobaan ulang. Pagination disembunyikan saat memuat/gagal.
  `emptyState` mendukung `icon`, `title`, `description`, dan aksi opsional
  `{ label, onClick }`, misalnya kembali ke halaman pertama.
- `TableCellText` menampilkan teks utama, `secondary` untuk blok rumah,
  dan `tag` untuk role. `TableBadge` menerima `tone` berupa `neutral`,
  `success`, `warning`, `info`, atau `danger`; status tetap berlabel teks.
  `TableActionLink` menerima `to`, `aria-label`, serta isi tautan.

Tabel menggunakan elemen semantik dan region gulir yang dapat difokuskan.
Lebar minimum mengikuti jumlah kolom: 44rem untuk hingga lima kolom,
52rem untuk enam kolom, dan 60rem untuk tujuh atau lebih. Petunjuk gulir
mengikuti lebar container komponen sendiri. Footer membungkus di layar
sempit; rentang hasil diumumkan melalui `aria-live="polite"` dan halaman
aktif memakai `aria-current="page"`.
