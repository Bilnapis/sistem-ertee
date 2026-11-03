# Text input

Komponen `src/components/TextInput.tsx` mengikuti warna hijau ErTee, radius
input 14px, dan skala spasi proyek. `FormField` mengekspor komponen yang sama
agar login, registrasi, dan formulir warga memakai satu implementasi.

Buka `/preview/text-input` saat menjalankan `npm run dev` untuk mencoba empat
state dan contoh formulir. Route preview hanya tersedia saat development.

```tsx
import { Mail } from 'lucide-react'
import { TextInput } from './components/TextInput'

<TextInput
  label="Email"
  name="email"
  type="email"
  placeholder="nama@contoh.id"
  helperText="Gunakan email yang masih aktif."
  leadingIcon={<Mail />}
  value={email}
  onChange={event => setEmail(event.target.value)}
  error={errors.email}
  required
/>
```

| State | Pemicu | Tampilan dan perilaku |
| --- | --- | --- |
| Idle | Belum menerima fokus | Permukaan putih, border netral, label terlihat. |
| Active | Input atau tombol mata menerima fokus | Border hijau, halo lembut, outline tambahan untuk navigasi keyboard. |
| Error | `error="Pesan perbaikan"` | Border merah, ikon peringatan, pesan teks; fokus tidak menutupi error. |
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

Untuk password, gunakan `type="password"`, `visible`, dan
`onToggleVisibility`. Properti `hiddenIcon` dipertahankan untuk pemanggil lama.
Properti `static` menonaktifkan skala tekan pada tombol password.
Gunakan `readOnly` untuk nilai yang masih boleh difokuskan dan disalin.

Layout memakai logical properties, input yang dapat menyusut, helper yang
membungkus, dan ikon yang tidak menyusut. Ukuran teks input 16px mencegah zoom
otomatis pada perangkat seluler. Variabel CSS `--text-input-min-height`
(default 52px) dan `--text-input-gap` (default 4px, mengikuti form proyek)
memungkinkan kepadatan berbeda; login mempertahankan tinggi 60px dan gap 8px.
Preview memakai gap 8px dan antarfield setidaknya 16px.

Hover hanya aktif pada pointer yang mendukung hover. Transisi properti
tertentu maksimal 150ms dan skala tombol 0.96 hanya aktif tanpa preferensi
reduced motion. Pergantian ikon memakai cross-fade 300ms, atau hanya opacity
150ms saat reduced motion. Forced colors mempertahankan batas, outline fokus, serta
ikon dan pesan error.

## Hasil pemeriksaan

Cakupan: komponen TextInput dan halaman preview, diuji dengan Chrome.

- No actionable layout findings.
- No actionable UI-polish findings.
- Build TypeScript/Vite dan lint lulus.
- Sembilan pengujian komponen lulus: fokus keyboard, prioritas error saat
  fokus, helper dan error yang terhubung, ID unik, penerusan ref, password,
  disabled melalui prop/fieldset, reduced motion, dan forced colors.
- Layout LTR/RTL tidak menggulir horizontal pada 320, 360, 768, 1280,
  dan 1440px. Label panjang berbahasa Jerman dan pseudo-lokalisasi, serta
  pembesaran teks 200%, diperiksa di setiap lebar tersebut.
- Screenshot desktop 1280px dan ponsel 320px diperiksa secara visual.
- Not verified: zoom browser native 200%, replay animasi pada kecepatan
  10% melalui panel Animations, dan pembacaan dengan screen reader nyata.

Pemeriksaan regresi formulir lama menghasilkan 23 tes lulus dan 4 tes
terhenti karena tombol `Keluar` atau `Buka menu navigasi` tidak tersedia
pada `AuthenticatedLayout` saat ini. Perubahan layout tersebut sudah ada
sebelum pekerjaan komponen ini dan tidak diubah di sini. Persetujuan di
bawah berlaku untuk cakupan komponen yang diperiksa.

Approve
