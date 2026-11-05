import { useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Hash,
  LockKeyhole,
  Mail,
  TextCursorInput,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink, Button } from '../components/Button'
import { TextInput } from '../components/TextInput'

export default function TextInputPreview() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const emailInput = useRef<HTMLInputElement>(null)

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(false)
    if (!emailInput.current?.validity.valid) {
      setError('Masukkan alamat email yang valid, misalnya nama@contoh.id.')
      emailInput.current?.focus()
      return
    }
    setError('')
    setSaved(true)
  }

  return (
    <div className="@container/page min-h-dvh bg-page px-4 [--text-input-gap:0.5rem]">
      <header className="mx-auto flex w-full max-w-[68rem] flex-wrap items-center justify-between gap-4 py-7 @max-[22rem]/page:py-4">
        <Link
          className="inline-flex flex-wrap items-center gap-3 text-xl font-bold text-ink"
          to="/login"
          aria-label="ErTee, ke halaman masuk"
        >
          <span
            className="grid size-10 place-items-center rounded-control bg-action text-white"
            aria-hidden="true"
          >
            <TextCursorInput size={22} />
          </span>
          ErTee
          <span className="ms-1 border-s border-border ps-4 text-sm font-medium text-muted">
            Komponen
          </span>
        </Link>
        <ButtonLink
          to="/login"
          variant="ghost"
          leadingIcon={<ArrowLeft size={16} aria-hidden="true" />}
          size="text"
          mirrorIcons
        >
          Halaman masuk
        </ButtonLink>
      </header>
      <main className="mx-auto w-full max-w-[68rem] pt-11 pb-6 @max-[44rem]/page:pt-6">
        <div className="mb-10 max-w-[40rem] [&>h1]:mb-4 [&>h1]:text-[clamp(2.5rem,5cqi,3.5rem)] [&>h1]:leading-[1.15] [&>h1]:font-semibold [&>h1]:tracking-[-0.045em] [&>p:last-child]:max-w-[34rem] [&>p:last-child]:text-base [&>p:last-child]:leading-relaxed [&>p:last-child]:text-muted">
          <p className="mb-4 text-xs font-bold tracking-[0.12em] text-action">
            FORMULIR / 01
          </p>
          <h1>
            Text input<span className="text-action">.</span>
          </h1>
          <p>
            Ruang untuk setiap jawaban. Label yang jelas, detail yang rapi, dan
            respons di setiap interaksi.
          </p>
        </div>

        <section
          className="rounded-card border border-transparent bg-surface p-8 shadow-[0_0_0_1px_oklch(0_0_0/0.04),0_4px_12px_oklch(0_0_0/0.025)] @max-[44rem]/page:p-6 @max-[22rem]/page:p-4 forced-colors:border-[CanvasText]"
          aria-labelledby="states-title"
        >
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4 [&_h2]:text-base [&_h2]:leading-normal [&_h2]:font-semibold [&_p]:mt-1.5 [&_p]:text-sm [&_p]:leading-normal [&_p]:text-muted">
            <div>
              <h2 id="states-title">Satu komponen, empat state</h2>
              <p>Klik atau gunakan Tab untuk mencoba perpindahan fokus.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs leading-normal font-semibold text-success [&>span]:size-1.5 [&>span]:rounded-full [&>span]:bg-action">
              <span aria-hidden="true" />
              Interaktif
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-8 @max-[44rem]/page:grid-cols-1 @max-[44rem]/page:gap-8">
            <article className="min-w-0">
              <div className="mb-5 flex flex-wrap items-baseline gap-2 [&>h3]:m-0 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:text-ink">
                <span className="text-xs text-muted tabular-nums">01</span>
                <h3>Idle</h3>
                <span className="ms-auto text-xs leading-normal text-muted @max-[22rem]/page:ms-0 @max-[22rem]/page:basis-full">
                  Siap diisi
                </span>
              </div>
              <TextInput
                label="Nama lengkap"
                placeholder="Masukkan nama lengkap"
                helperText="Gunakan nama sesuai identitas Anda."
                leadingIcon={<UserRound />}
                autoComplete="off"
              />
            </article>
            <article className="min-w-0">
              <div className="mb-5 flex flex-wrap items-baseline gap-2 [&>h3]:m-0 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:text-ink">
                <span className="text-xs text-muted tabular-nums">02</span>
                <h3>Active</h3>
                <span className="ms-auto text-xs leading-normal text-muted @max-[22rem]/page:ms-0 @max-[22rem]/page:basis-full">
                  Sedang difokuskan
                </span>
              </div>
              <TextInput
                label="Alamat email"
                type="email"
                defaultValue="warga@contoh.id"
                helperText="Fokus mengikuti input yang Anda pilih."
                leadingIcon={<Mail />}
                autoFocus
                autoComplete="off"
              />
            </article>
            <article className="min-w-0">
              <div className="mb-5 flex flex-wrap items-baseline gap-2 [&>h3]:m-0 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:text-ink">
                <span className="text-xs text-muted tabular-nums">03</span>
                <h3>Error</h3>
                <span className="ms-auto text-xs leading-normal text-muted @max-[22rem]/page:ms-0 @max-[22rem]/page:basis-full">
                  Perlu diperbaiki
                </span>
              </div>
              <TextInput
                label="Nomor HP"
                type="tel"
                defaultValue="0812"
                error="Nomor HP belum lengkap. Masukkan 10–15 digit angka."
                leadingIcon={<Hash />}
                autoComplete="off"
              />
            </article>
            <article className="min-w-0">
              <div className="mb-5 flex flex-wrap items-baseline gap-2 [&>h3]:m-0 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:text-ink">
                <span className="text-xs text-muted tabular-nums">04</span>
                <h3>Disabled</h3>
                <span className="ms-auto text-xs leading-normal text-muted @max-[22rem]/page:ms-0 @max-[22rem]/page:basis-full">
                  Tidak dapat diubah
                </span>
              </div>
              <TextInput
                label="Wilayah tempat tinggal"
                defaultValue="RT 04"
                helperText="Wilayah ditentukan oleh pengurus RT."
                leadingIcon={<LockKeyhole />}
                disabled
              />
            </article>
          </div>
        </section>

        <section
          className="mt-8 grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-12 rounded-card bg-[#eef4f0] p-8 @max-[44rem]/page:grid-cols-1 @max-[44rem]/page:gap-6 @max-[44rem]/page:p-6 @max-[22rem]/page:p-4"
          aria-labelledby="try-title"
        >
          <div className="min-w-0 [&>h2]:text-2xl [&>h2]:leading-snug [&>h2]:font-semibold [&>h2]:tracking-[-0.025em] [&>p]:mt-3 [&>p]:max-w-[28ch] [&>p]:text-sm [&>p]:leading-relaxed [&>p]:text-slate-600 @max-[44rem]/page:[&>p]:max-w-[48ch]">
            <span className="mb-4 inline-flex text-action" aria-hidden="true">
              <TextCursorInput size={22} />
            </span>
            <h2 id="try-title">Coba langsung.</h2>
            <p>
              Isi email, tampilkan password, lalu periksa respons formulirnya.
            </p>
            <p className="mt-6! text-xs! text-[#52645a]!">
              Contoh interaksi. Data tidak dikirim atau disimpan.
            </p>
          </div>
          <form
            className="flex min-w-0 flex-col gap-4"
            noValidate
            onSubmit={submit}
          >
            <TextInput
              ref={emailInput}
              label="Email untuk dicoba"
              type="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
                setSaved(false)
              }}
              placeholder="nama@contoh.id"
              helperText="Gunakan format nama@domain.id."
              error={error}
              leadingIcon={<Mail />}
              aria-describedby="demo-email-note"
              autoComplete="off"
            />
            <span className="sr-only" id="demo-email-note">
              Hanya untuk pratinjau komponen.
            </span>
            <TextInput
              label="Password untuk dicoba"
              type="password"
              placeholder="Masukkan password contoh"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setSaved(false)
              }}
              helperText="Gunakan tombol mata untuk menampilkan atau menyembunyikan teks."
              leadingIcon={<LockKeyhole />}
              visible={visible}
              onToggleVisibility={() => setVisible((previous) => !previous)}
              autoComplete="off"
            />
            <div className="flex flex-wrap items-center gap-4">
              <Button
                type="submit"
                variant="solid"
                trailingIcon={<ArrowRight size={18} aria-hidden="true" />}
                mirrorIcons
              >
                Periksa input
              </Button>
              <p
                className="flex items-start gap-1.5 text-xs leading-normal text-success empty:hidden [&>svg]:shrink-0"
                role="status"
              >
                {saved ? (
                  <>
                    <Check size={18} aria-hidden="true" />
                    Format email sudah benar.
                  </>
                ) : null}
              </p>
            </div>
          </form>
        </section>
        <footer className="flex flex-wrap justify-between gap-3 py-7 text-xs text-muted">
          <span>ErTee · Layanan Digital Warga</span>
          <span>Text input / v1.0</span>
        </footer>
      </main>
    </div>
  )
}
