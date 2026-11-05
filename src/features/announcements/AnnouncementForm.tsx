import { useId, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router'
import { Button } from '../../components/Button'
import { Feedback } from '../../components/Feedback'
import { TextInput } from '../../components/TextInput'
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalForm,
} from '../../components/Modal'
import {
  announcementError,
  isAnnouncementConflict,
  saveAnnouncement,
  useAnnouncement,
} from './data'
import { fromWibInput, toWibInput } from './schedule'
import type { Announcement } from './types'

type Mode = 'create' | 'edit' | 'republish'

function AnnouncementEditor({
  initial,
  mode,
  now,
  onSaved,
  onPending,
  reload,
}: {
  initial?: Announcement
  mode: Mode
  now?: number
  onSaved: (announcement: Announcement) => void
  onPending: (pending: boolean) => void
  reload: () => Promise<Announcement | undefined>
}) {
  const [current, setCurrent] = useState(initial)
  const [requestId] = useState(() => crypto.randomUUID())
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [starts, setStarts] = useState(
    initial ? toWibInput(initial.starts_at) : '',
  )
  const [ends, setEnds] = useState(initial ? toWibInput(initial.ends_at) : '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [reloading, setReloading] = useState(false)
  const descriptionId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const mutation = useMutation({
    onMutate: () => onPending(true),
    mutationFn: () =>
      saveAnnouncement(
        {
          title,
          description,
          starts_at: fromWibInput(starts)!,
          ends_at: fromWibInput(ends)!,
        },
        requestId,
        current,
        mode === 'republish',
      ),
    onSuccess: onSaved,
    onSettled: () => onPending(false),
  })
  const stale = isAnnouncementConflict(mutation.error)
  const invalidAction =
    current && (mode === 'republish') !== Boolean(current.archived_at)
  async function reloadForm() {
    setReloading(true)
    try {
      const fresh = await reload()
      if (!fresh) return
      setCurrent(fresh)
      setTitle(fresh.title)
      setDescription(fresh.description)
      setStarts(toWibInput(fresh.starts_at))
      setEnds(toWibInput(fresh.ends_at))
      setErrors({})
      mutation.reset()
    } finally {
      setReloading(false)
    }
  }
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mutation.isPending || stale || invalidAction || reloading) return
    const next: Record<string, string> = {}
    const start = fromWibInput(starts),
      end = fromWibInput(ends)
    if (!title.trim() || [...title.trim()].length > 200)
      next.title = 'Isi judul, maksimal 200 karakter.'
    if (!description.trim() || [...description.trim()].length > 2000)
      next.description = 'Isi deskripsi, maksimal 2.000 karakter.'
    if (!start)
      next.starts = 'Isi tanggal dan jam mulai tayang yang valid dalam WIB.'
    if (!end)
      next.ends = 'Isi tanggal dan jam selesai tayang yang valid dalam WIB.'
    else if (start && Date.parse(end) <= Date.parse(start))
      next.ends = 'Selesai tayang harus setelah mulai tayang.'
    else if (mode !== 'edit' && now !== undefined && Date.parse(end) <= now)
      next.ends = 'Waktu selesai tayang harus masih di masa depan.'
    setErrors(next)
    if (Object.keys(next).length) {
      window.requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      )
      return
    }
    mutation.mutate()
  }
  return (
    <ModalForm
      ref={formRef}
      onSubmit={submit}
      noValidate

      aria-busy={mutation.isPending || reloading}
    >
      <ModalBody>
        <p className="rounded-control bg-page p-3 text-sm leading-relaxed text-muted">
          Seluruh jadwal menggunakan WIB. Pengumuman otomatis tampil sesuai
          waktu mulai dan berhenti pada waktu selesai.
        </p>
        <fieldset
          disabled={mutation.isPending || reloading}
          className="m-0 grid min-w-0 grid-cols-2 gap-4 border-0 p-0 max-sm:grid-cols-1"
        >
          <legend className="sr-only">Isi dan jadwal pengumuman</legend>
          <TextInput
            label="Judul"
            required
            value={title}
            maxLength={200}
            error={errors.title}
            wrapperClassName="col-span-full"
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="col-span-full flex min-w-0 flex-col gap-1.5">
            <div className="text-sm font-semibold text-slate-700">
              <label htmlFor={descriptionId}>Deskripsi</label>{' '}
              <span aria-hidden="true" className="text-danger">
                *
              </span>
            </div>
            <textarea
              id={descriptionId}
              required
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={`${descriptionId}-help${errors.description ? ` ${descriptionId}-error` : ''}`}
              className="min-h-36 w-full min-w-0 resize-y rounded-control border border-control-border bg-surface px-3 py-3 text-base leading-6 text-ink hover:border-slate-600 disabled:bg-soft aria-invalid:border-danger"
            />
            <p id={`${descriptionId}-help`} className="text-xs text-muted">
              Teks biasa, maksimal 2.000 karakter. Baris baru akan
              dipertahankan.
            </p>
            <p
              id={`${descriptionId}-error`}
              aria-live="polite"
              className="text-xs text-danger empty:sr-only"
            >
              {errors.description}
            </p>
          </div>
          <TextInput
            label="Mulai tayang (WIB)"
            type="datetime-local"
            step="1"
            required
            value={starts}
            error={errors.starts}
            onChange={(e) => setStarts(e.target.value)}
          />
          <TextInput
            label="Selesai tayang (WIB)"
            type="datetime-local"
            step="1"
            required
            value={ends}
            error={errors.ends}
            onChange={(e) => setEnds(e.target.value)}
          />
        </fieldset>
        {invalidAction ? (
          <Feedback>
            Status pengumuman telah berubah. Tutup formulir lalu buka kembali
            melalui detail terbaru.
          </Feedback>
        ) : null}
        {mutation.isError ? (
          <div className="flex flex-col gap-3">
            <Feedback>{announcementError(mutation.error)}</Feedback>
            {stale ? (
              <>
                <p className="text-sm text-muted">
                  Muat ulang akan mengganti masukan formulir dengan data
                  terbaru. Salin perubahan Anda jika masih diperlukan.
                </p>
                <Button
                  type="button"
                  disabled={reloading}
                  onClick={() => void reloadForm()}
                  variant="outline"
                >
                  {reloading ? 'Memuat ulang…' : 'Muat ulang data dan formulir'}
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button
          type="submit"
          disabled={
            mutation.isPending || reloading || stale || Boolean(invalidAction)
          }
          variant="solid"
        >
          {mutation.isPending
            ? 'Menyimpan…'
            : mode === 'republish'
              ? 'Simpan dan tayangkan ulang'
              : 'Simpan Pengumuman'}
        </Button>
      </ModalFooter>
    </ModalForm>
  )
}

export default function AnnouncementForm({ mode }: { mode: Mode }) {
  const { id } = useParams()
  const detail = useAnnouncement(mode === 'create' ? undefined : id, 'manage')
  const context = useOutletContext<{ now?: number }>()
  const navigate = useNavigate()
  const location = useLocation()
  const client = useQueryClient()
  const [pending, setPending] = useState(false)
  const initial = detail.data?.announcement
  const close = () =>
    navigate({ pathname: '/admin/pengumuman', search: location.search })
  return (
    <Modal
      title={
        mode === 'create'
          ? 'Buat Pengumuman'
          : mode === 'edit'
            ? 'Edit Pengumuman'
            : 'Tayangkan Ulang Pengumuman'
      }
      onClose={close}
      pending={pending}
    >
      {mode !== 'create' && initial && detail.isError ? (
        <ModalBody>
          <div className="mb-4">
            <Feedback>
              Pemeriksaan data terbaru gagal. Masukan Anda tetap tersedia.
              Periksa koneksi sebelum menyimpan.
            </Feedback>
          </div>
        </ModalBody>
      ) : null}
      {mode !== 'create' && detail.isPending ? (
        <ModalBody>
          <p role="status">Memuat pengumuman…</p>
        </ModalBody>
      ) : mode !== 'create' && detail.isError && !initial ? (
        <ModalBody>
          <div className="flex flex-col gap-3">
            <Feedback>{announcementError(detail.error)}</Feedback>
            <Button
              type="button"
              onClick={() => void detail.refetch()}
              variant="outline"
            >
              Coba lagi
            </Button>
          </div>
        </ModalBody>
      ) : mode === 'create' || initial ? (
        <AnnouncementEditor
          key={`${mode}:${id ?? 'new'}`}
          initial={initial}
          mode={mode}
          now={detail.now ?? context.now}
          onPending={setPending}
          reload={async () => {
            const result = await detail.refetch()
            return result.isSuccess ? result.data?.announcement : undefined
          }}
          onSaved={async (announcement) => {
            await client.invalidateQueries({ queryKey: ['announcements'] })
            navigate(
              {
                pathname: `/admin/pengumuman/${announcement.id}`,
                search: location.search,
              },
              { replace: true, state: { announcementSaved: true } },
            )
          }}
        />
      ) : null}
    </Modal>
  )
}
