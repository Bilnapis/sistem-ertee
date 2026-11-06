import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '../../components/Button'
import { Feedback } from '../../components/Feedback'
import { FormField } from '../../components/FormField'
import { getSupabase } from '../../lib/supabase'
import { validatePassword } from '../../../supabase/functions/_shared/resident'
import type { FieldErrors } from '../../../supabase/functions/_shared/resident'
import { residentError } from './data'

type Props = {
  residentId: string
  disabled: boolean
  onPending: (pending: boolean) => void
}

export function ResidentPasswordForm({
  residentId,
  disabled,
  onPending,
}: Props) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const form = useRef<HTMLFormElement>(null)
  const mutation = useMutation({
    mutationFn: async (nextPassword: string) => {
      const { data, error } = await getSupabase().functions.invoke<{
        id: string
      }>('update-resident-password', {
        body: { id: residentId, password: nextPassword },
      })
      if (error) {
        if (error.context instanceof Response)
          throw await error.context.json().catch(() => error)
        throw error
      }
      if (data?.id !== residentId) throw new Error('PASSWORD_UPDATE_FAILED')
    },
  })

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || mutation.isPending) return
    const nextErrors = validatePassword(password)
    if (password !== confirmation)
      nextErrors.confirmation = 'Konfirmasi password harus sama.'
    setErrors(nextErrors)
    mutation.reset()
    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      )
      return
    }
    onPending(true)
    try {
      await mutation.mutateAsync(password)
      setPassword('')
      setConfirmation('')
      setVisible(false)
    } catch (error) {
      const serverErrors = (error as { errors?: FieldErrors })?.errors
      if (serverErrors) setErrors(serverErrors)
    } finally {
      onPending(false)
    }
  }

  return (
    <form ref={form} className="shrink-0" onSubmit={submit} noValidate>
      <fieldset
        disabled={disabled || mutation.isPending}
        className="m-0 grid min-w-0 grid-cols-2 gap-4 rounded-control border border-border p-4 max-sm:grid-cols-1"
      >
        <legend className="px-1 text-base font-semibold">
          Perbarui Password
        </legend>
        <p className="col-span-full text-sm leading-6 text-muted">
          Isi password baru untuk akun warga ini, lalu pilih Perbarui Password.
          Gunakan 8–128 karakter.
        </p>
        <FormField
          id="resident-new-password"
          label="Password Baru"
          type="password"
          required
          value={password}
          error={errors.password}
          autoComplete="new-password"
          maxLength={128}
          visible={visible}
          onToggleVisibility={() => setVisible((value) => !value)}
          onChange={(event) => {
            setPassword(event.target.value)
            setErrors({})
            mutation.reset()
          }}
        />
        <FormField
          id="resident-new-password-confirmation"
          label="Konfirmasi Password Baru"
          type={visible ? 'text' : 'password'}
          required
          value={confirmation}
          error={errors.confirmation}
          autoComplete="new-password"
          maxLength={128}
          onChange={(event) => {
            setConfirmation(event.target.value)
            setErrors({})
            mutation.reset()
          }}
        />
        <div className="col-span-full flex flex-col items-start gap-3">
          {mutation.isError ? (
            <Feedback>{residentError(mutation.error)}</Feedback>
          ) : null}
          {mutation.isSuccess ? (
            <p className="text-sm leading-6 text-success" role="status">
              Password akun warga berhasil diperbarui.
            </p>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            disabled={disabled || mutation.isPending}
          >
            {mutation.isPending ? 'Memperbarui Password…' : 'Perbarui Password'}
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
