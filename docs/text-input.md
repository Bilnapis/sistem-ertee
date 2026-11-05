# Text input

Komponen `src/components/TextInput.tsx` mengikuti warna hijau ErTee, radius
input 12px, dan skala spasi proyek. `FormField` mengekspor komponen yang sama
agar login, registrasi, dan formulir warga memakai satu implementasi.

Buka `/preview/text-input` saat menjalankan `npm run dev` untuk mencoba empat
state dan contoh formulir. Route preview hanya tersedia saat development.

```tsx
import { Mail } from 'lucide-react'
import { TextInput } from './components/TextInput'

;<TextInput
  label="Email"
  name="email"
  type="email"
  placeholder="nama@contoh.id"
  helperText="Gunakan email yang masih aktif."
  leadingIcon={<Mail />}
  value={email}
  onChange={(event) => setEmail(event.target.value)}
  error={errors.email}
  required
/>
```

| State    | Pemicu                                    | Tampilan dan perilaku                                                                |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Idle     | Belum menerima fokus                      | Permukaan putih, border `#e2e8f0`, label terlihat secara default.                    |
| Active   | Input atau tombol mata menerima fokus     | Border hijau, halo lembut, outline tambahan untuk navigasi keyboard.                 |
| Error    | `error="Pesan perbaikan"`                 | Border merah, ikon peringatan, pesan teks; fokus tidak menutupi error.               |
| Disabled | `disabled` atau induk `fieldset disabled` | Permukaan abu-abu, tidak bisa diedit atau menerima fokus; tombol mata ikut nonaktif. |

`error` tidak melakukan validasi sendiri; pemanggil menentukan kapan pesan
muncul. `aria-invalid` juga diterima untuk menandai invaliditas tanpa pesan
internal. Atribut invalid native baru tidak otomatis menampilkan error merah
sebelum pengguna berinteraksi.

Komponen menerima atribut input native, `ref` React 19, `className` untuk
input, dan `wrapperClassName` untuk pembungkus. `id` otomatis unik bila tidak
diisi. Helper, pesan error, dan `aria-describedby` dari pemanggil digabungkan;
pesan error memakai live region sopan. Label tetap ada saat placeholder
hilang. `required` menambahkan tanda bintang jika label belum memilikinya.

Gunakan `hideLabel` untuk pencarian pada toolbar tabel. Label tetap terhubung
dengan input dan tersedia untuk pembaca layar; placeholder memberikan konteks
visual. Label pada formulir dan kontrol tanggal tetap terlihat secara default.

Untuk password, gunakan `type="password"`, `visible`, dan
`onToggleVisibility`. Properti `hiddenIcon` dipertahankan untuk pemanggil lama.
Properti `static` menonaktifkan skala tekan pada tombol password.
Gunakan `readOnly` untuk nilai yang masih boleh difokuskan dan disalin.

Layout memakai logical properties, input yang dapat menyusut, helper yang
membungkus, dan ikon yang tidak menyusut. Ukuran teks input 16px mencegah zoom
otomatis pada perangkat seluler. Variabel CSS `--text-input-min-height`
(default 48px) dan `--text-input-gap` (default 4px, mengikuti form proyek)
memungkinkan kepadatan berbeda; login memakai tinggi 48px dan gap 8px, sama dengan tinggi kontrol formulir fitur.
Preview memakai gap 8px dan antarfield setidaknya 16px.

Hover hanya aktif pada pointer yang mendukung hover. Transisi properti
tertentu maksimal 150ms dan skala tombol 0.96 hanya aktif tanpa preferensi
reduced motion. Pergantian ikon memakai cross-fade 300ms, atau hanya opacity
150ms saat reduced motion. Forced colors mempertahankan batas, outline fokus, serta
ikon dan pesan error.

## Validasi migrasi Tailwind

Utility ditulis langsung pada komponen dengan varian native `focus-within`,
`data-[invalid]`, `has-disabled`, `motion-safe`, dan `forced-colors`.
`cn` menggabungkan class bawaan dengan `className`/`wrapperClassName` dari pemanggil.
API, ID, label, live region dan penerusan ref tetap sama.

Suite Playwright mencakup fokus, prioritas error, helper/error yang terhubung, ID
unik, ref, password, disabled melalui prop/fieldset, RTL, label panjang, teks
200%, reduced motion dan forced colors. Lebar screenshot mencakup 320, 360, 375,
768, 1280, 1440 dan 1648 px. Hasil akhir dicatat di `docs/tailwind-migration.md`.

Belum diverifikasi: Safari/Firefox, perangkat iOS fisik, pembacaan screen reader
nyata, serta replay animasi melalui panel Animations.
