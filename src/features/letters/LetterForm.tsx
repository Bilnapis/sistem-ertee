import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, FileUp, Info, Paperclip } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { TextInput } from '../../components/TextInput'
import { Feedback } from '../../components/Feedback'
import type {
  Json,
  LetterAttachment,
  LetterRequest,
  LetterType,
} from '../../lib/database.types'
import { getSupabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import {
  eligibilityMessage,
  letterError,
  letterTypes,
  uploadAttachment,
  validateAttachment,
} from './data'
import { LetterModal } from './LetterModal'
import { LetterTypePicker } from './LetterTypePicker'
import styles from './Letters.module.css'

type Errors = Partial<
  Record<'type' | 'purpose' | 'phone' | 'notes' | 'file', string>
>
export default function LetterForm() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const client = useQueryClient()
  const [requestId] = useState(() => crypto.randomUUID())
  const [type, setType] = useState<LetterType | ''>('')
  const [purpose, setPurpose] = useState('')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [choosing, setChoosing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const uploaded = useRef<{ file: File; attachment: LetterAttachment } | null>(
    null,
  )
  const close = () =>
    navigate({ pathname: '/warga/pengajuan-surat', search: location.search })
  const submission = useMutation({
    mutationFn: async () => {
      let attachment: LetterAttachment | null = null
      if (file) {
        attachment =
          uploaded.current?.file === file
            ? uploaded.current.attachment
            : await uploadAttachment(profile!.id, requestId, file)
        uploaded.current = { file, attachment }
      }
      const { data, error } = await getSupabase()
        .rpc('submit_letter_request', {
          p_request_id: requestId,
          p_letter_type: type,
          p_purpose: purpose.trim(),
          p_contact_phone: phone.replace(/[\s().-]/g, ''),
          p_additional_notes: notes.trim(),
          p_attachment: attachment as Json,
        })
        .single<LetterRequest>()
      if (error) throw error
      return data
    },
    onSuccess: async (request) => {
      await client.invalidateQueries({ queryKey: ['letters'] })
      navigate(
        {
          pathname: `/warga/pengajuan-surat/${request.id}`,
          search: location.search,
        },
        { replace: true, state: { letterSubmitted: true } },
      )
    },
  })
  if (!profile) return null
  const blocked = eligibilityMessage(profile)
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submission.isPending) return
    const next: Errors = {}
    if (!type) next.type = 'Pilih jenis surat.'
    if (!purpose.trim() || purpose.trim().length > 2000)
      next.purpose = 'Isi keperluan surat, maksimal 2.000 karakter.'
    if (!/^(?:0|\+?62)8\d{7,12}$/.test(phone.replace(/[\s().-]/g, '')))
      next.phone = 'Gunakan nomor HP Indonesia, misalnya 081234567890.'
    if (notes.length > 2000)
      next.notes = 'Keterangan tambahan maksimal 2.000 karakter.'
    if (file) next.file = validateAttachment(file) ?? undefined
    setErrors(next)
    if (Object.values(next).some(Boolean)) {
      window.requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      )
      return
    }
    submission.mutate()
  }
  return (
    <LetterModal
      title="Form Pengajuan Surat"
      description="Lengkapi data berikut untuk mengajukan surat."
      kind="form"
      pending={submission.isPending}
      onClose={close}
    >
      {blocked ? (
        <div className={styles.blocked}>
          <Feedback>{blocked}</Feedback>
          <Link to="/warga/profil" className={styles.textLink}>
            Periksa profil saya
          </Link>
          <button type="button" className={styles.secondary} onClick={close}>
            Kembali ke pengajuan
          </button>
        </div>
      ) : (
        <form
          ref={formRef}
          noValidate
          onSubmit={submit}
          aria-busy={submission.isPending}
        >
          <fieldset
            className={styles.formFields}
            disabled={submission.isPending}
          >
            <legend className={styles.srOnly}>Informasi pengajuan surat</legend>
            <TextInput
              label="Nama Pemohon"
              value={profile.full_name}
              readOnly
            />
            <div className={styles.field}>
              <label id="letter-type-label" htmlFor="letter-type">
                Jenis Surat <span aria-hidden="true">*</span>
              </label>
              <button
                id="letter-type"
                type="button"
                className={styles.selectTrigger}
                aria-haspopup="dialog"
                aria-labelledby="letter-type-label letter-type-value"
                aria-invalid={Boolean(errors.type)}
                aria-describedby={errors.type ? 'letter-type-error' : undefined}
                onClick={() => setChoosing(true)}
              >
                <span id="letter-type-value">
                  {type ? letterTypes[type] : 'Pilih jenis surat'}
                </span>
                <ChevronDown size={20} aria-hidden="true" />
              </button>
              {errors.type ? (
                <p
                  id="letter-type-error"
                  className={styles.fieldError}
                  role="alert"
                >
                  {errors.type}
                </p>
              ) : null}
            </div>
            <TextInput
              label="Blok Rumah"
              value={profile.house_block}
              readOnly
            />
            <TextInput
              label="Nomor Rumah"
              value={profile.house_number ?? 'Belum diisi'}
              readOnly
            />
            <TextInput
              label="Keperluan Surat"
              placeholder="Contoh: Administrasi pekerjaan"
              required
              value={purpose}
              maxLength={2000}
              onChange={(event) => setPurpose(event.target.value)}
              error={errors.purpose}
            />
            <TextInput
              label="Nomor HP Aktif"
              placeholder="08xxxxxxxxxx"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              maxLength={25}
              onChange={(event) => setPhone(event.target.value)}
              error={errors.phone}
            />
            <div className={styles.field}>
              <label htmlFor="letter-notes">Keterangan Tambahan</label>
              <textarea
                id="letter-notes"
                rows={3}
                placeholder="Tambahkan keterangan jika diperlukan"
                value={notes}
                maxLength={2000}
                onChange={(event) => setNotes(event.target.value)}
                aria-invalid={Boolean(errors.notes)}
                aria-describedby={
                  errors.notes ? 'letter-notes-error' : undefined
                }
              />
              {errors.notes ? (
                <p id="letter-notes-error" className={styles.fieldError}>
                  {errors.notes}
                </p>
              ) : null}
            </div>
            <div className={styles.field}>
              <label htmlFor="letter-file">Lampiran Pendukung</label>
              <div className={styles.fileControl}>
                <input
                  id="letter-file"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  aria-describedby={`letter-file-help${errors.file ? ' letter-file-error' : ''}`}
                  aria-invalid={Boolean(errors.file)}
                  onChange={(event) => {
                    const next = event.target.files?.[0] ?? null
                    setFile(next)
                    setErrors((previous) => ({
                      ...previous,
                      file: next
                        ? (validateAttachment(next) ?? undefined)
                        : undefined,
                    }))
                  }}
                />
                {file ? (
                  <Paperclip size={20} aria-hidden="true" />
                ) : (
                  <FileUp size={20} aria-hidden="true" />
                )}
                <span>{file ? file.name : 'Unggah berkas (opsional)'}</span>
              </div>
              <p id="letter-file-help" className={styles.helper}>
                JPG, PNG, PDF • Maksimal 5 MB
              </p>
              {file ? (
                <button
                  type="button"
                  className={styles.textLink}
                  onClick={() => {
                    setFile(null)
                    const input = document.getElementById(
                      'letter-file',
                    ) as HTMLInputElement
                    input.value = ''
                    setErrors((previous) => ({ ...previous, file: undefined }))
                  }}
                >
                  Hapus pilihan berkas
                </button>
              ) : null}
              {errors.file ? (
                <p
                  id="letter-file-error"
                  className={styles.fieldError}
                  role="alert"
                >
                  {errors.file}
                </p>
              ) : null}
            </div>
          </fieldset>
          <p className={styles.notice}>
            <Info size={20} aria-hidden="true" />
            <span>
              Pengajuan surat akan diproses secara manual oleh pengurus RT.
              Status pengajuan dapat dipantau melalui ErTee.
            </span>
          </p>
          {submission.isError ? (
            <div className={styles.feedback}>
              <Feedback>
                {letterError(submission.error)} Data formulir tetap tersimpan di
                dialog ini.
              </Feedback>
            </div>
          ) : null}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={submission.isPending}
              onClick={close}
            >
              Batal
            </button>
            <button
              type="submit"
              className={styles.primary}
              disabled={submission.isPending}
            >
              {submission.isPending ? 'Mengirim pengajuan…' : 'Kirim Pengajuan'}
            </button>
          </div>
        </form>
      )}
      {choosing ? (
        <LetterTypePicker
          value={type}
          onClose={() => setChoosing(false)}
          onSelect={(value) => {
            setType(value)
            setErrors((previous) => ({ ...previous, type: undefined }))
            setChoosing(false)
          }}
        />
      ) : null}
    </LetterModal>
  )
}
