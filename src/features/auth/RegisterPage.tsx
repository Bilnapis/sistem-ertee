import { cn } from '../../lib/cn'
import { buttons } from '../../components/ui'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { MailCheck } from 'lucide-react'
import { FormField } from '../../components/FormField'
import { Feedback } from '../../components/Feedback'
import { getSupabase, setSessionPersistence } from '../../lib/supabase'
import { authErrorMessage } from './errors'
import { emptyRegistration, validateRegistration } from './validation'
import type { FieldErrors, Registration } from './validation'

export function RegisterPage() {
  const [values, setValues] = useState<Registration>(emptyRegistration)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [hidden, setHidden] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const bind = (name: keyof Registration) => ({
    id: name,
    name,
    value: values[name],
    error: fieldErrors[name],
    required: true,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((previous) => ({ ...previous, [name]: event.target.value }))
      setFieldErrors((previous) => ({ ...previous, [name]: undefined }))
    },
  })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const errors = validateRegistration(values)
    setFieldErrors(errors)
    setError('')
    const firstError = Object.keys(errors)[0]
    if (firstError) {
      document.getElementById(firstError)?.focus()
      return
    }
    setPending(true)
    try {
      setSessionPersistence(false)
      const {
        password,
        confirmation: _confirmation,
        email,
        ...profile
      } = values
      const metadata = Object.fromEntries(
        Object.entries(profile).map(([key, value]) => [key, value.trim()]),
      )
      const { error } = await getSupabase().auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      setValues(emptyRegistration)
      setSubmitted(true)
    } catch (error) {
      setError(authErrorMessage(error))
    } finally {
      setPending(false)
    }
  }

  if (submitted)
    return (
      <main className="relative flex min-h-svh flex-col items-center justify-center px-5 py-8 max-sm:px-4">
        <section
          className={cn(
            'w-full rounded-card bg-surface shadow-card',
            'flex max-w-[560px] flex-col gap-6 p-10 text-center max-sm:px-6 max-sm:py-7 [&>p]:text-sm [&>p]:leading-6 [&>p]:text-muted',
          )}
          aria-labelledby="confirmation-title"
        >
          <MailCheck
            size={44}
            className="self-center text-brand"
            aria-hidden="true"
          />
          <h1 id="confirmation-title">Periksa email Anda</h1>
          <p role="status">
            Permintaan pendaftaran telah diterima. Jika email dapat didaftarkan,
            tautan konfirmasi akan dikirim. Buka tautan tersebut di browser yang
            sama untuk mengaktifkan akun.
          </p>
          <Link className={cn(buttons.primary, 'w-full')} to="/login">
            Kembali ke halaman masuk
          </Link>
          <p className="text-muted">
            Sudah memiliki akun? Gunakan email dan password Anda untuk masuk.
          </p>
        </section>
      </main>
    )

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center px-5 py-8 max-sm:px-4">
      <section
        className={cn(
          'w-full rounded-card bg-surface shadow-card',
          'max-w-[900px] p-8 max-sm:px-5 max-sm:py-7',
        )}
        aria-labelledby="register-title"
      >
        <header className="text-center [&>p]:mt-1 [&>p]:text-base [&>p]:leading-6 [&>p]:text-muted max-sm:[&>p]:text-sm">
          <h1 id="register-title">Buat Akun Warga</h1>
          <p>Daftarkan akun Anda untuk mengakses layanan ErTee.</p>
        </header>
        <form noValidate onSubmit={submit} aria-busy={pending}>
          <div className="mt-4 grid grid-cols-2 gap-4 max-sm:mt-6 max-sm:grid-cols-1">
            <FormField
              {...bind('full_name')}
              label="Nama Lengkap *"
              placeholder="Masukkan nama lengkap"
              autoComplete="name"
              maxLength={150}
            />
            <FormField
              {...bind('email')}
              label="Email *"
              type="email"
              placeholder="contoh@email.com"
              autoComplete="email"
              maxLength={254}
            />
            <FormField
              {...bind('nik')}
              label="NIK *"
              placeholder="Masukkan 16 digit NIK"
              inputMode="numeric"
              maxLength={16}
              autoComplete="off"
            />
            <FormField
              {...bind('phone')}
              label="Nomor HP *"
              type="tel"
              placeholder="08xxxxxxxxxx"
              autoComplete="tel"
              maxLength={16}
            />
            <FormField
              {...bind('address')}
              label="Alamat *"
              placeholder="Masukkan alamat lengkap"
              autoComplete="street-address"
              maxLength={500}
            />
            <FormField
              {...bind('house_block')}
              label="Blok Rumah *"
              placeholder="Masukkan nomor atau blok rumah"
              maxLength={50}
              autoComplete="address-line2"
            />
            <FormField
              {...bind('password')}
              label="Password *"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              maxLength={128}
              visible={!hidden}
              onToggleVisibility={() => setHidden((value) => !value)}
              aria-describedby="password-requirement"
            />
            <FormField
              {...bind('confirmation')}
              label="Konfirmasi Password *"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              maxLength={128}
              visible={!hidden}
              onToggleVisibility={() => setHidden((value) => !value)}
            />
          </div>
          <div
            className={cn(
              'flex min-h-6 flex-wrap items-center justify-between gap-3 text-sm leading-5',
              'mt-3 max-sm:mt-4 max-sm:flex-col max-sm:items-start max-sm:gap-2 [&>span]:text-muted',
            )}
          >
            <label className="flex cursor-pointer items-center gap-2 text-slate-600 [&>input]:m-0 [&>input]:size-5 [&>input]:shrink-0 [&>input]:cursor-pointer [&>input]:accent-action">
              <input
                type="checkbox"
                checked={hidden}
                onChange={(event) => setHidden(event.target.checked)}
              />
              Sembunyikan Password
            </label>
            <span id="password-requirement">Minimal 8 karakter</span>
          </div>
          <div className="flex min-h-12 items-center py-2 max-sm:min-h-8 [&>div]:w-full">
            {error ? <Feedback>{error}</Feedback> : null}
          </div>
          <button
            className={cn(buttons.primary, 'w-full')}
            type="submit"
            disabled={pending}
          >
            {pending ? 'Mendaftarkan akun…' : 'Daftar Akun'}
          </button>
        </form>
        <p className="flex min-h-6 flex-wrap items-center justify-center gap-2 text-sm leading-5 text-muted [&>a]:font-bold [&>a]:text-action [&>a:hover]:underline">
          Sudah punya akun? <Link to="/login">Masuk di sini</Link>
        </p>
      </section>
    </main>
  )
}
