import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { FormField } from '../../components/FormField'
import { Feedback } from '../../components/Feedback'
import { getSupabase } from '../../lib/supabase'
import type { ResidentFields, ResidentProfile, ResidentRole } from '../../lib/database.types'
import { emptyResident, normalizeResident, validateAccount, validateResident } from '../../../supabase/functions/_shared/resident'
import type { FieldErrors } from '../../../supabase/functions/_shared/resident'
import { genderLabels, maritalLabels, residentError, roleLabels, updateResident, useRefreshResidents } from './data'
import styles from './Residents.module.css'

export function fieldsFromProfile(profile?: ResidentProfile): ResidentFields {
  return profile ? normalizeResident(profile) : { ...emptyResident }
}
type Props = { profile?: ResidentProfile; manageAccess?: boolean; onSaved: (id: string) => void; onCancel: () => void; onPending: (pending: boolean) => void }
export function ResidentEditor({ profile, manageAccess = false, onSaved, onCancel, onPending }: Props) {
  const [original] = useState(profile)
  const [fields, setFields] = useState(() => fieldsFromProfile(original))
  const [email, setEmail] = useState(original?.email ?? '')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [role, setRole] = useState<ResidentRole>(original?.role ?? 'warga')
  const [active, setActive] = useState(original?.is_active ?? true)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [confirmDisable, setConfirmDisable] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const request = useRef({ signature: '', id: '' })
  const refresh = useRefreshResidents()
  const mutation = useMutation({ mutationFn: async (values: ResidentFields) => {
    if (original) {
      await updateResident(original, values, manageAccess ? { role, is_active: active } : undefined)
      return original.id
    }
    const body = { ...values, email: email.trim(), password, role, is_active: active }
    const signature = JSON.stringify(body)
    if (request.current.signature !== signature) request.current = { signature, id: crypto.randomUUID() }
    const { data, error } = await getSupabase().functions.invoke<{ id: string }>('create-resident', { body: { ...body, request_id: request.current.id } })
    if (error) {
      if (error.context instanceof Response) throw await error.context.json().catch(() => error)
      throw error
    }
    if (!data?.id) throw new Error('CREATE_FAILED')
    return data.id
  } })
  const setField = (key: keyof ResidentFields, value: string) => { setFields(previous => ({ ...previous, [key]: value })); setConfirmDisable(false) }

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mutation.isPending) return
    const normalized = normalizeResident(fields)
    const nextErrors = { ...validateResident(normalized), ...(!original ? validateAccount(email.trim(), password, role) : {}) }
    if (!original && password !== confirmation) nextErrors.confirmation = 'Konfirmasi password harus sama.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    if (original?.is_active && manageAccess && !active && !confirmDisable) { setConfirmDisable(true); return }
    onPending(true)
    try { const id = await mutation.mutateAsync(normalized); await refresh(); onSaved(id) }
    catch (error) {
      const serverErrors = (error as { errors?: FieldErrors })?.errors
      if (serverErrors) setErrors(serverErrors)
    } finally { onPending(false) }
  }
  const reset = () => {
    setFields(fieldsFromProfile(original)); setEmail(original?.email ?? ''); setPassword(''); setConfirmation('')
    setRole(original?.role ?? 'warga'); setActive(original?.is_active ?? true); setErrors({}); mutation.reset(); setConfirmDisable(false)
  }
  const placeholders: Partial<Record<keyof ResidentFields, string>> = { full_name: 'Masukkan nama lengkap', nik: '16 digit angka', family_card_number: '16 digit angka', house_block: 'Contoh: A-05', phone: 'Contoh: 0812-0000-0408', address: 'Masukkan alamat lengkap' }
  const textField = (key: keyof ResidentFields, label: string, maxLength: number, inputMode?: 'numeric' | 'tel') => <FormField id={`resident-${key}`} label={label} value={fields[key]} error={errors[key]} placeholder={placeholders[key]} required={label.endsWith(' *')} maxLength={maxLength} inputMode={inputMode} onChange={event => setField(key, event.target.value)} />
  const selection = (key: 'gender' | 'marital_status', label: string, options: Record<string, string>) => <div className="field"><label htmlFor={`resident-${key}`}>{label}</label><select required className={styles.select} id={`resident-${key}`} value={fields[key]} onChange={event => setField(key, event.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `resident-${key}-error` : undefined}><option value="">Pilih {label.toLocaleLowerCase('id-ID').replace(' *', '')}</option>{Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>{errors[key] ? <p className="field-error" id={`resident-${key}-error`}>{errors[key]}</p> : null}</div>

  return <form ref={form} onSubmit={submit} noValidate className={styles.editor}>
    <fieldset disabled={mutation.isPending} className={styles.formFields}>
      <legend className={styles.srOnly}>Identitas warga</legend>
      {textField('full_name', 'Nama Lengkap *', 150)}{textField('nik', 'NIK *', 16, 'numeric')}
      {textField('family_card_number', 'Nomor Kartu Keluarga *', 16, 'numeric')}{selection('gender', 'Jenis Kelamin *', genderLabels)}
      {selection('marital_status', 'Status Pernikahan *', maritalLabels)}{textField('house_block', 'Blok Rumah *', 50)}
      {textField('phone', 'Nomor HP *', 25, 'tel')}{textField('address', 'Alamat Lengkap *', 500)}
      <FormField id="resident-email" label="Email *" type="email" required value={email} readOnly={Boolean(original)} error={errors.email} maxLength={254} autoComplete="off" onChange={event => setEmail(event.target.value)} />
      {manageAccess ? <><div className="field"><label htmlFor="resident-role">Role *</label><select id="resident-role" className={styles.select} value={role} onChange={event => { setRole(event.target.value as ResidentRole); setConfirmDisable(false) }}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="resident-active">Status Warga *</label><select id="resident-active" className={styles.select} value={String(active)} onChange={event => { setActive(event.target.value === 'true'); setConfirmDisable(false) }}><option value="true">Aktif</option><option value="false">Tidak Aktif</option></select></div></> : null}
      {!original ? <><FormField id="resident-password" label="Password *" type="password" required value={password} error={errors.password} autoComplete="new-password" maxLength={128} visible={visible} onToggleVisibility={() => setVisible(value => !value)} onChange={event => setPassword(event.target.value)} /><FormField id="resident-confirmation" label="Konfirmasi Password *" required type={visible ? 'text' : 'password'} value={confirmation} error={errors.confirmation} autoComplete="new-password" maxLength={128} onChange={event => setConfirmation(event.target.value)} /></> : null}
    </fieldset>
    <p className={styles.notice}><Info size={18} aria-hidden="true" />{original ? 'Perubahan identitas akan diperiksa ulang oleh pengurus RT.' : 'NIK dan Nomor KK wajib 16 digit. Akun aktif dapat langsung digunakan untuk masuk.'}</p>
    {mutation.isError ? <Feedback>{residentError(mutation.error)}</Feedback> : null}
    {confirmDisable ? <div className={styles.confirmation} role="alert"><strong>Nonaktifkan akun {original?.full_name}?</strong><p>Akun ini akan kehilangan akses layanan, termasuk sesi yang sedang digunakan.</p></div> : null}
    <footer className={styles.dialogActions}><button type="button" className={styles.textButton} disabled={mutation.isPending} onClick={reset}>Reset</button><div><button type="button" className={styles.secondary} disabled={mutation.isPending} onClick={onCancel}>Batal</button><button type="submit" className={styles.primary} disabled={mutation.isPending}>{mutation.isPending ? 'Menyimpan…' : confirmDisable ? 'Konfirmasi & simpan' : original ? 'Simpan Perubahan' : 'Simpan Warga'}</button></div></footer>
  </form>
}
