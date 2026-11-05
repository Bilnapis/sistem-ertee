import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, FileUp, Info, Paperclip } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { Button, ButtonLink } from '../../components/Button'
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
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalForm,
} from '../../components/Modal'
import { LetterTypePicker } from './LetterTypePicker'

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
    <Modal
      title="Form Pengajuan Surat"
      description="Lengkapi data berikut untuk mengajukan surat."
      pending={submission.isPending}
      onClose={close}
    >
      {blocked ? (
        <ModalBody>
          <div className="flex flex-col gap-4 py-3">
            <Feedback>{blocked}</Feedback>
            <ButtonLink
              to="/warga/profil"
              variant="ghost"
              size="text"
              align="start"
            >
              Periksa profil saya
            </ButtonLink>
            <Button type="button" onClick={close} variant="outline">
              Kembali ke pengajuan
            </Button>
          </div>
        </ModalBody>
      ) : (
        <ModalForm
          ref={formRef}
          noValidate
          onSubmit={submit}
          aria-busy={submission.isPending}
        >
          <ModalBody>
            <fieldset
              className="m-0 grid min-w-0 grid-cols-2 gap-4 border-0 p-0 max-sm:grid-cols-1 [&_input[readonly]]:text-muted"
              disabled={submission.isPending}
            >
              <legend className="sr-only">Informasi pengajuan surat</legend>
              <TextInput
                label="Nama Pemohon"
                value={profile.full_name}
                readOnly
              />
              <div className="flex min-w-0 flex-col gap-1.5 [&>label]:text-sm [&>label]:leading-5 [&>label]:font-semibold [&>label]:text-slate-700">
                <label id="letter-type-label" htmlFor="letter-type">
                  Jenis Surat <span aria-hidden="true">*</span>
                </label>
                <Button
                  id="letter-type"
                  type="button"
                  aria-haspopup="dialog"
                  aria-labelledby="letter-type-label letter-type-value"
                  aria-invalid={Boolean(errors.type)}
                  aria-describedby={
                    errors.type ? 'letter-type-error' : undefined
                  }
                  onClick={() => setChoosing(true)}
                  variant="outline"
                  trailingIcon={<ChevronDown size={20} aria-hidden="true" />}
                  width="full"
                  align="between"
                >
                  <span id="letter-type-value">
                    {type ? letterTypes[type] : 'Pilih jenis surat'}
                  </span>
                </Button>
                {errors.type ? (
                  <p
                    id="letter-type-error"
                    className="text-xs leading-normal text-danger"
                    role="alert"
                  >
                    {errors.type}
                  </p>
                ) : null}
              </div>
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
              <div className="flex min-w-0 flex-col gap-1.5 [&>label]:text-sm [&>label]:leading-5 [&>label]:font-semibold [&>label]:text-slate-700">
                <label htmlFor="letter-notes">Keterangan Tambahan</label>
                <textarea
                  className="min-h-24 w-full min-w-0 resize-y rounded-control border border-control-border bg-surface px-3 py-2.5 text-start font-sans text-base leading-6 text-ink placeholder:text-muted hover:border-slate-600 focus-visible:border-action focus-visible:outline-action disabled:cursor-not-allowed disabled:border-border disabled:bg-soft disabled:text-muted disabled:opacity-100 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger [&[readonly]]:bg-page"
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
                  <p
                    id="letter-notes-error"
                    className="text-xs leading-normal text-danger"
                  >
                    {errors.notes}
                  </p>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-col gap-1.5 [&>label]:text-sm [&>label]:leading-5 [&>label]:font-semibold [&>label]:text-slate-700">
                <label htmlFor="letter-file">Lampiran Pendukung</label>
                <div className="relative flex min-h-24 items-center justify-start gap-3 rounded-control border border-control-border p-4 text-sm leading-normal wrap-anywhere text-slate-700 focus-within:outline-3 focus-within:outline-offset-4 focus-within:outline-focus [&_input]:absolute [&_input]:inset-0 [&_input]:h-full [&_input]:w-full [&_input]:cursor-pointer [&_input]:opacity-0 [&_svg]:shrink-0 [&_svg]:text-muted">
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
                <p
                  id="letter-file-help"
                  className="text-xs leading-normal text-muted"
                >
                  JPG, PNG, PDF • Maksimal 5 MB
                </p>
                {file ? (
                  <Button
                    type="button"
                    onClick={() => {
                      setFile(null)
                      const input = document.getElementById(
                        'letter-file',
                      ) as HTMLInputElement
                      input.value = ''
                      setErrors((previous) => ({
                        ...previous,
                        file: undefined,
                      }))
                    }}
                    variant="ghost"
                    size="text"
                    align="start"
                  >
                    Hapus pilihan berkas
                  </Button>
                ) : null}
                {errors.file ? (
                  <p
                    id="letter-file-error"
                    className="text-xs leading-normal text-danger"
                    role="alert"
                  >
                    {errors.file}
                  </p>
                ) : null}
              </div>
            </fieldset>
            <p className="flex items-start gap-3 rounded-summary border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-normal text-info [&>svg]:mt-0.5 [&>svg]:shrink-0">
              <Info size={20} aria-hidden="true" />
              <span>
                Pengajuan surat akan diproses secara manual oleh pengurus RT.
                Status pengajuan dapat dipantau melalui ErTee.
              </span>
            </p>
            {submission.isError ? (
              <div className="flex flex-col gap-2">
                <Feedback>
                  {letterError(submission.error)} Data formulir tetap tersimpan
                  di dialog ini.
                </Feedback>
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submission.isPending}
              onClick={close}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="solid"
              disabled={submission.isPending}
            >
              {submission.isPending ? 'Mengirim pengajuan…' : 'Kirim Pengajuan'}
            </Button>
          </ModalFooter>
        </ModalForm>
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
    </Modal>
  )
}
