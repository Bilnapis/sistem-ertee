import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Plus, RefreshCw, Save } from 'lucide-react'
import { Button, ButtonLink } from '../components/Button'

export default function ButtonPreview() {
  const [actions, setActions] = useState(0)
  const [submissions, setSubmissions] = useState(0)
  const [visits, setVisits] = useState(0)
  const action = useRef<HTMLButtonElement>(null)
  return (
    <main className="@container/page mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1>Button</h1>
        <ButtonLink
          to="/login"
          variant="ghost"
          size="text"
          leadingIcon={<ArrowLeft />}
          mirrorIcons
        >
          Halaman masuk
        </ButtonLink>
      </header>
      <section
        className="flex flex-col gap-5 rounded-card bg-surface p-5"
        aria-label="Varian tombol"
      >
        <h2 className="text-xl font-semibold">Empat varian</h2>
        <div className="flex flex-wrap gap-3">
          {(['solid', 'outline', 'ghost', 'danger'] as const).map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
      </section>
      <section
        className="flex flex-col gap-5 rounded-card bg-surface p-5"
        aria-label="Ikon tombol"
      >
        <h2 className="text-xl font-semibold">Ikon dan label</h2>
        <div className="flex flex-wrap gap-3">
          <Button leadingIcon={<Plus />}>Tambah warga</Button>
          <Button
            variant="outline"
            leadingIcon={<Save />}
            trailingIcon={<ArrowRight />}
            mirrorIcons
          >
            Simpan dan lanjutkan
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Muat ulang contoh"
            leadingIcon={<RefreshCw />}
          />
        </div>
        <Button width="full" trailingIcon={<ArrowRight />} mirrorIcons>
          Konfirmasi perubahan data warga dan lanjutkan ke langkah berikutnya
        </Button>
      </section>
      <section
        className="flex flex-col gap-5 rounded-card bg-surface p-5"
        aria-label="Interaksi tombol"
      >
        <h2 className="text-xl font-semibold">Interaksi</h2>
        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            setSubmissions((count) => count + 1)
          }}
        >
          <Button ref={action} onClick={() => setActions((count) => count + 1)}>
            Aksi contoh
          </Button>
          <Button type="submit">Simpan contoh</Button>
          <Button disabled onClick={() => setActions((count) => count + 1)}>
            Aksi nonaktif
          </Button>
          <ButtonLink
            to="#button-preview-target"
            disabled
            onClick={() => setVisits((count) => count + 1)}
            onAuxClick={() => setVisits((count) => count + 1)}
          >
            Tautan nonaktif
          </ButtonLink>
          <ButtonLink to="#button-preview-target">Buka contoh</ButtonLink>
        </form>
        <fieldset disabled className="m-0 border-0 p-0">
          <legend className="sr-only">Formulir nonaktif</legend>
          <Button variant="outline">Dinonaktifkan oleh formulir</Button>
        </fieldset>
        <Button variant="ghost" onClick={() => action.current?.focus()}>
          Fokuskan aksi
        </Button>
        <div
          className="flex flex-wrap gap-4 text-sm text-muted"
          id="button-preview-target"
        >
          <p>
            Aksi: <output aria-label="Jumlah aksi">{actions}</output>
          </p>
          <p>
            Submit: <output aria-label="Jumlah submit">{submissions}</output>
          </p>
          <p>
            Navigasi: <output aria-label="Jumlah navigasi">{visits}</output>
          </p>
        </div>
      </section>
    </main>
  )
}
