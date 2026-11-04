import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Feedback } from '../../components/Feedback'
import { formatDate, roleLabels } from '../residents/data'
import { ComplaintModal } from './ComplaintModal'
import { ComplaintSelect, ComplaintTextarea } from './ComplaintFields'
import { ComplaintStatusBadge } from './ComplaintStatusBadge'
import {
  complaintActions,
  complaintCategories,
  complaintError,
  complaintStatuses,
  reviewComplaint,
  useComplaint,
} from './data'
import type { Complaint, ComplaintAction, ComplaintCategory } from './types'

type ReviewInput = {
  complaint: Complaint
  action: ComplaintAction
  category: ComplaintCategory
  note: string
}

function ComplaintReview({
  complaint,
  pending,
  blocked,
  onReview,
}: {
  complaint: Complaint
  pending: boolean
  blocked: boolean
  onReview: (input: ReviewInput) => void
}) {
  const [category, setCategory] = useState(complaint.category)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  function action(next: ComplaintAction) {
    if (pending || blocked) return
    if ((next === 'complete' || next === 'reject') && !note.trim()) {
      setNoteError(
        next === 'reject' ? 'Isi alasan penolakan.' : 'Isi hasil penanganan.',
      )
      window.requestAnimationFrame(() =>
        formRef.current?.querySelector('textarea')?.focus(),
      )
      return
    }
    if (next === 'reject') {
      setRejecting(true)
      return
    }
    setNoteError('')
    onReview({ complaint, action: next, category, note })
  }
  return (
    <section
      className="mt-6 border-t border-border pt-6"
      aria-label="Penanganan pengaduan"
    >
      <h3 className="mb-4 text-lg font-bold">Penanganan pengaduan</h3>
      <form
        ref={formRef}
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-4"
      >
        <fieldset
          disabled={pending || blocked}
          className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0"
        >
          <legend className="sr-only">Tindakan pengurus</legend>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 max-sm:grid-cols-1">
            <ComplaintSelect
              label="Kategori pengaduan"
              value={category}
              onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
            >
              {Object.entries(complaintCategories).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </ComplaintSelect>
            <button
              type="button"
              disabled={category === complaint.category}
              onClick={() => action('recategorize')}
              className="min-h-12 rounded-control border border-border bg-surface px-4 py-3 text-sm font-bold text-action hover:bg-page disabled:cursor-default disabled:opacity-50"
            >
              Simpan kategori
            </button>
          </div>
          <ComplaintTextarea
            label="Catatan penanganan"
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              setNoteError('')
            }}
            maxLength={2000}
            error={noteError}
            helperText="Opsional saat mulai proses. Wajib diisi sebagai hasil penyelesaian atau alasan penolakan. Maksimal 2.000 karakter."
          />
          <div className="flex justify-end gap-3 max-sm:flex-col">
            <button
              type="button"
              onClick={() => action('reject')}
              className="min-h-12 rounded-control border border-danger bg-surface px-5 py-3 text-sm font-bold text-danger hover:bg-danger-soft"
            >
              Tolak Pengaduan
            </button>
            <button
              type="button"
              onClick={() =>
                action(complaint.status === 'diajukan' ? 'start' : 'complete')
              }
              className="min-h-12 rounded-control border border-transparent bg-action px-5 py-3 text-sm font-bold text-white hover:bg-action-hover disabled:cursor-wait disabled:opacity-65 forced-colors:border-[ButtonText]"
            >
              {pending
                ? 'Menyimpan…'
                : complaint.status === 'diajukan'
                  ? 'Mulai Proses'
                  : 'Selesaikan'}
            </button>
          </div>
        </fieldset>
      </form>
      {rejecting ? (
        <ComplaintModal
          title="Tolak Pengaduan"
          description={`Tolak pengaduan “${complaint.title}” (${complaint.reference})?`}
          kind="confirm"
          pending={pending}
          onClose={() => setRejecting(false)}
        >
          <p className="mb-2 text-sm font-semibold">Alasan penolakan</p>
          <p className="mb-6 rounded-summary bg-page p-4 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
            {note}
          </p>
          <p className="mb-6 text-sm text-muted">
            Alasan ini dapat dibaca pengaju. Pengaduan yang ditolak tidak dapat
            diproses kembali.
          </p>
          <div className="flex justify-end gap-3 max-sm:flex-col-reverse">
            <button
              type="button"
              disabled={pending}
              onClick={() => setRejecting(false)}
              className="min-h-12 rounded-control border border-border bg-surface px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-65"
            >
              Kembali
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setRejecting(false)
                onReview({ complaint, action: 'reject', category, note })
              }}
              className="min-h-12 rounded-control border border-transparent bg-danger px-5 py-3 text-sm font-bold text-white disabled:opacity-65 forced-colors:border-[ButtonText]"
            >
              Ya, Tolak Pengaduan
            </button>
          </div>
        </ComplaintModal>
      ) : null}
    </section>
  )
}

export default function ComplaintDetails({
  manage = false,
}: {
  manage?: boolean
}) {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const client = useQueryClient()
  const detail = useComplaint(id, manage)
  const close = () =>
    navigate({
      pathname: `${manage ? '/admin' : '/warga'}/pengaduan`,
      search: location.search,
    })
  const change = useMutation({
    mutationFn: ({ complaint, action, category, note }: ReviewInput) =>
      reviewComplaint(complaint, action, category, note),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['complaints'] })
    },
  })
  const data = detail.data?.complaint
  const blocked = (change.error as { code?: string } | null)?.code === '40001'
  return (
    <ComplaintModal
      title="Detail Pengaduan"
      description={
        data
          ? `${data.reference} • ${complaintCategories[data.category]}`
          : undefined
      }
      onClose={close}
      pending={change.isPending}
    >
      {detail.isPending ? (
        <p role="status">Memuat detail pengaduan…</p>
      ) : detail.isError ? (
        <div className="flex flex-col gap-4">
          <Feedback>{complaintError(detail.error)}</Feedback>
          <button
            type="button"
            onClick={() => void detail.refetch()}
            className="min-h-12 rounded-control border border-border px-5 py-3 text-sm font-bold text-action"
          >
            Coba lagi detail
          </button>
        </div>
      ) : null}
      {data && !detail.isError ? (
        <>
          {location.state?.complaintSubmitted ? (
            <p
              role="status"
              className="mb-5 rounded-control bg-success-soft p-3 text-sm text-success"
            >
              Pengaduan berhasil dikirim. Pantau penanganannya di halaman ini.
            </p>
          ) : null}
          {change.isSuccess ? (
            <p
              role="status"
              className="mb-5 rounded-control bg-success-soft p-3 text-sm text-success"
            >
              Pengaduan berhasil diperbarui.
            </p>
          ) : null}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <h3 className="min-w-0 flex-1 text-xl font-bold wrap-anywhere">
              {data.title}
            </h3>
            <ComplaintStatusBadge status={data.status} />
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm max-sm:grid-cols-1 [&_dd]:m-0 [&_dd]:font-semibold [&_dd]:wrap-anywhere [&_dt]:mb-1 [&_dt]:text-muted">
            {[
              ['Nama pengaju', data.identity_snapshot.full_name],
              ['Blok rumah', data.identity_snapshot.house_block],
              [
                'Nomor rumah',
                data.identity_snapshot.house_number ?? 'Belum diisi',
              ],
              ['Tanggal pengajuan', formatDate(data.created_at)],
              ['Kategori', complaintCategories[data.category]],
              ['Status', complaintStatuses[data.status]],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <section className="mt-5" aria-label="Deskripsi pengaduan">
            <h3 className="mb-2 text-sm font-semibold">Deskripsi pengaduan</h3>
            <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
              {data.description}
            </p>
          </section>
          {data.resolution_note ? (
            <section
              className="mt-5 rounded-summary border border-border bg-page p-4"
              aria-label={
                data.status === 'ditolak'
                  ? 'Alasan penolakan'
                  : 'Hasil penanganan'
              }
            >
              <h3 className="mb-2 text-sm font-bold">
                {data.status === 'ditolak'
                  ? 'Alasan penolakan'
                  : 'Hasil penanganan'}
              </h3>
              <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
                {data.resolution_note}
              </p>
            </section>
          ) : null}
          <details
            className="mt-6 rounded-summary border border-border p-4 text-sm [&_li]:py-3 [&_p]:mt-1"
            open
          >
            <summary className="cursor-pointer font-bold">
              Riwayat pengaduan ({detail.data?.events.length ?? 0})
            </summary>
            <ol className="mt-3 list-decimal ps-5">
              {detail.data?.events.map((event) => (
                <li key={event.id} className="wrap-anywhere">
                  <strong>{complaintActions[event.action]}</strong>
                  <p>
                    {event.previous_status &&
                    event.previous_status !== event.status
                      ? `${complaintStatuses[event.previous_status]} → `
                      : ''}
                    {complaintStatuses[event.status]}
                  </p>
                  {event.previous_category &&
                  event.previous_category !== event.category ? (
                    <p>
                      Kategori: {complaintCategories[event.previous_category]} →{' '}
                      {complaintCategories[event.category]}
                    </p>
                  ) : null}
                  {event.note ? (
                    <p className="whitespace-pre-wrap">{event.note}</p>
                  ) : null}
                  <p className="text-muted">
                    {event.actor_name} · {roleLabels[event.actor_role]}
                  </p>
                  <time dateTime={event.occurred_at} className="text-muted">
                    {formatDate(event.occurred_at)}
                  </time>
                </li>
              ))}
            </ol>
          </details>
          {change.isError ? (
            <div className="mt-5 flex flex-col gap-3">
              <Feedback>{complaintError(change.error)}</Feedback>
              <button
                type="button"
                onClick={async () => {
                  await detail.refetch()
                  await client.invalidateQueries({
                    queryKey: ['complaints', 'overview'],
                  })
                  change.reset()
                }}
                className="min-h-12 self-start rounded-control border border-border px-4 py-3 text-sm font-bold text-action"
              >
                Muat ulang detail
              </button>
            </div>
          ) : null}
          {manage && data.status !== 'selesai' && data.status !== 'ditolak' ? (
            <ComplaintReview
              key={data.updated_at}
              complaint={data}
              pending={change.isPending}
              blocked={blocked || detail.isFetching}
              onReview={(input) => change.mutate(input)}
            />
          ) : null}
        </>
      ) : null}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={change.isPending}
          onClick={close}
          className="min-h-12 rounded-control border border-border bg-surface px-5 py-3 text-sm font-bold text-slate-700 hover:bg-page disabled:opacity-65"
        >
          Tutup
        </button>
      </div>
    </ComplaintModal>
  )
}
