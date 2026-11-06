import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/Button'
import { Logo } from '../../components/Logo'
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
      const { data, error } = await getSupabase().auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: metadata,
        },
      })
      if (error) throw error
      // GuestLayout opens the resident dashboard once Auth adopts the session.
      if (!data.session) throw new Error('REGISTRATION_SESSION_UNAVAILABLE')
      setValues(emptyRegistration)
    } catch (error) {
      setError(authErrorMessage(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center px-5 py-8 max-sm:px-4">
      <section
        className="w-full max-w-[900px] rounded-card bg-surface p-8 shadow-card max-sm:px-5 max-sm:py-7"
        aria-labelledby="register-title"
      >
        <header className="text-center [&>p]:mt-1 [&>p]:text-base [&>p]:leading-6 [&>p]:text-muted max-sm:[&>p]:text-sm">
          <Logo className="mx-auto mb-4" />
          <h1 id="register-title">Buat Akun Warga</h1>
          <p>Daftarkan akun Anda untuk mengakses layanan WargaKita.</p>
        </header>
        <form noValidate onSubmit={submit} aria-busy={pending}>
          <div className="mt-4 grid grid-cols-2 gap-4 max-sm:mt-6 max-sm:grid-cols-1">
            <FormField
              {...bind('full_name')}
              label="Nama Lengkap *"
              placeholder="Contoh: Budi"
              autoComplete="name"
              maxLength={150}
            />
            <FormField
              {...bind('email')}
              label="Email *"
              type="email"
              placeholder="Contoh: budi@email.com"
              autoComplete="email"
              maxLength={254}
            />
            <FormField
              {...bind('nik')}
              label="NIK *"
              placeholder="Contoh: 3173010101900001"
              inputMode="numeric"
              maxLength={16}
              autoComplete="off"
            />
            <FormField
              {...bind('family_card_number')}
              label="Nomor Kartu Keluarga *"
              placeholder="Contoh: 3173010101200001"
              inputMode="numeric"
              maxLength={16}
              autoComplete="off"
            />
            <FormField
              {...bind('phone')}
              label="Nomor HP *"
              type="tel"
              placeholder="Contoh: 081234567890"
              autoComplete="tel"
              maxLength={16}
            />
            <FormField
              {...bind('address')}
              label="Alamat *"
              placeholder="Contoh: Jl. Melati No. 10"
              autoComplete="street-address"
              maxLength={500}
            />
            <FormField
              {...bind('password')}
              label="Password *"
              type="password"
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              maxLength={128}
              visible={!hidden}
              onToggleVisibility={() => setHidden((value) => !value)}
            />
            <FormField
              {...bind('confirmation')}
              label="Konfirmasi Password *"
              type="password"
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              maxLength={128}
              visible={!hidden}
              onToggleVisibility={() => setHidden((value) => !value)}
            />
          </div>
          <div className="flex min-h-12 items-center py-2 max-sm:min-h-8 [&>div]:w-full">
            {error ? <Feedback>{error}</Feedback> : null}
          </div>
          <Button type="submit" disabled={pending} variant="solid" width="full">
            {pending ? 'Mendaftarkan akun…' : 'Daftar Akun'}
          </Button>
        </form>
        <p className="mt-4 flex min-h-6 flex-wrap items-center justify-center gap-2 text-sm leading-5 text-muted [&>a]:font-bold [&>a]:text-action [&>a:hover]:underline">
          Sudah punya akun? <Link to="/login">Masuk di sini</Link>
        </p>
      </section>
    </main>
  )
}
