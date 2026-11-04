import { cn } from '../../lib/cn'
import { buttons } from '../../components/ui'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { X } from 'lucide-react'
import { FormField } from '../../components/FormField'
import { Feedback } from '../../components/Feedback'
import {
  getSupabase,
  isSupabaseConfigured,
  setSessionPersistence,
} from '../../lib/supabase'
import { authErrorMessage } from './errors'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [remember, setRemember] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const helpDialog = useRef<HTMLDialogElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setError('')
    setPending(true)
    try {
      setSessionPersistence(remember)
      const { error } = await getSupabase().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) throw error
    } catch (error) {
      setError(authErrorMessage(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center px-5 py-8 max-sm:px-4">
      <section
        className={cn(
          'w-full rounded-card bg-surface shadow-card',
          'flex max-w-[560px] flex-col gap-6 px-10 py-5 max-sm:px-6 max-sm:py-7',
        )}
        aria-labelledby="login-title"
      >
        <header className="text-center [&>p]:mt-1 [&>p]:text-base [&>p]:leading-6 [&>p]:text-muted max-sm:[&>p]:text-sm">
          <h1 id="login-title">Selamat Datang!</h1>
          <p>Masuk untuk mengakses layanan warga ErTee.</p>
        </header>
        <form onSubmit={submit} aria-busy={pending}>
          <div className="flex flex-col gap-4 [--text-input-gap:0.5rem]">
            <FormField
              id="email"
              label="Email"
              type="email"
              placeholder="Masukkan alamat email"
              autoComplete="username"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <FormField
              id="password"
              label="Password"
              type="password"
              placeholder="Masukkan password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              visible={visible}
              hiddenIcon="eye"
              onToggleVisibility={() => setVisible((value) => !value)}
            />
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex min-h-6 flex-wrap items-center justify-between gap-3 text-sm leading-5">
              <label className="flex cursor-pointer items-center gap-2 text-slate-600 [&>input]:m-0 [&>input]:size-5 [&>input]:shrink-0 [&>input]:cursor-pointer [&>input]:accent-action">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Ingat saya
              </label>
              <button
                className={buttons.text}
                type="button"
                onClick={() => helpDialog.current?.showModal()}
              >
                Lupa password?
              </button>
            </div>
            {error ? <Feedback>{error}</Feedback> : null}
            <button
              className={cn(buttons.primary, 'w-full')}
              type="submit"
              disabled={pending}
            >
              {pending ? 'Sedang masuk…' : 'Masuk'}
            </button>
          </div>
        </form>
        <div className="flex flex-col gap-4">
          <p className="flex min-h-6 flex-wrap items-center justify-center gap-2 text-sm leading-5 text-muted [&>a]:font-bold [&>a]:text-action [&>a:hover]:underline">
            Belum punya akun? <Link to="/register">Daftar di sini</Link>
          </p>
          <p className="rounded-summary bg-page px-4 py-3 text-center text-sm leading-5 font-semibold text-slate-600">
            Butuh bantuan? Hubungi Admin RT
          </p>
        </div>
      </section>
      <footer className="mt-8 text-center text-sm leading-5 text-slate-500 max-sm:text-xs">
        © ErTee • Layanan Digital Warga
      </footer>
      {!isSupabaseConfigured ? (
        <p className="mt-6 px-5 text-center text-xs text-muted" role="status">
          Mode persiapan · Koneksi Supabase belum dikonfigurasi.
        </p>
      ) : null}
      <dialog
        ref={helpDialog}
        className="m-auto w-[calc(100%-2.5rem)] max-w-[480px] overflow-y-auto overscroll-contain rounded-dialog border-0 bg-surface p-8 text-ink shadow-dialog backdrop:bg-ink/40 [&>h2]:pe-7 [&>h2]:text-2xl [&>h2]:font-bold [&>p]:mt-4 [&>p]:mb-6 [&>p]:leading-6 [&>p]:text-muted"
        aria-labelledby="help-title"
      >
        <button
          className="absolute end-4 top-4 grid size-11 place-items-center rounded-control border-0 bg-transparent p-2 text-muted hover:bg-soft"
          type="button"
          aria-label="Tutup bantuan"
          onClick={() => helpDialog.current?.close()}
        >
          <X size={22} />
        </button>
        <h2 id="help-title">Bantuan akun</h2>
        <p>
          Hubungi pengurus RT untuk bantuan pemulihan password. Pemulihan
          mandiri melalui email belum tersedia pada tahap ini.
        </p>
        <button
          type="button"
          className={cn(buttons.primary, 'w-full')}
          onClick={() => helpDialog.current?.close()}
        >
          Mengerti
        </button>
      </dialog>
    </main>
  )
}
