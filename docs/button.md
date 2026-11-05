# Button

`Button` dan `ButtonLink` memakai gaya tombol Tambah warga dari halaman Data
Warga. Seluruh gaya berada di `src/components/Button.tsx`. Keduanya menolak
`className` dan `style`, termasuk saat props disebarkan dari object. Parent hanya
mengatur susunan dan penempatan, tanpa selector untuk mengubah gaya tombol.

```tsx
import { Plus, ArrowRight } from 'lucide-react'
import { Button, ButtonLink } from '../components/Button'

<Button variant="solid" leadingIcon={<Plus />} onClick={createResident}>
  Tambah warga
</Button>

<ButtonLink variant="outline" to="/admin/warga" trailingIcon={<ArrowRight />}>
  Lihat warga
</ButtonLink>
```

| Prop                          | Pilihan dan perilaku                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `variant`                     | `solid` (default), `outline`, `ghost`, `danger`                                                                         |
| `leadingIcon`, `trailingIcon` | Ikon sebelum dan sesudah label; dekoratif bagi pembaca layar                                                            |
| `size`                        | `default` minimum 48 px; `compact` minimum 44 px; `text` minimum 44 px dengan padding horizontal nol; `icon` 44 × 44 px |
| `width`                       | `auto` (default), `full`, `responsive` (penuh saat container `page` di bawah 33rem)                                     |
| `align`                       | `center` (default), `start`, `between`                                                                                  |
| `tone`                        | `default`; `inverse` untuk varian ghost pada permukaan gelap                                                            |
| `mirrorIcons`                 | Membalik ikon arah pada layout RTL                                                                                      |
| `disabled`                    | Native pada Button; ButtonLink melewati urutan Tab dan memblokir aktivasi serta callback                                |

`Button` memakai `type="button"` secara default; formulir memasok
`type="submit"` secara eksplisit. Atribut native, event, dan ref tetap tersedia.
`ButtonLink` menghasilkan link React Router, sehingga `to`, `replace`, `state`,
`target`, dan semantik navigasi tetap tersedia. Tombol ikon saja wajib memiliki
`aria-label`. Label panjang dapat membungkus; ikon tidak menyusut.

Semua tombol fitur, tombol modal, pagination, aksi tabel, menu akun, kontrol
password, dan preview memakai komponen ini. Tombol Tambah warga memakai
`size="compact" width="responsive"` sesuai tampilan header acuannya.

Preview pengembangan tersedia pada `/preview/button` dan tidak disertakan
dalam build produksi. Pengujian browser memeriksa perilaku formulir, ref,
disabled, keyboard, ikon, RTL, dan pembesaran teks pada 375 dan 1280 px.
