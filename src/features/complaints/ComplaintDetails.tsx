import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button'
import { Feedback } from '../../components/Feedback'
import { formatDate, roleLabels } from '../residents/data'
import { Modal, ModalBody, ModalFooter } from '../../components/Modal'
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
            <Button
              type="button"
              disabled={category === complaint.category}
              onClick={() => action('recategorize')}
              variant="outline"
            >
              Simpan kategori
            </Button>
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
            <Button
              type="button"
              onClick={() => action('reject')}
              variant="danger"
            >
              Tolak Pengaduan
            </Button>
            <Button
              type="button"
              onClick={() =>
                action(complaint.status === 'diajukan' ? 'start' : 'complete')
              }
              variant="solid"
            >
              {pending
                ? 'Menyimpan…'
                : complaint.status === 'diajukan'
                  ? 'Mulai Proses'
                  : 'Selesaikan'}
            </Button>
          </div>
        </fieldset>
      </form>
      {rejecting ? (
        <Modal
          title="Tolak Pengaduan"
          description={`Tolak pengaduan “${complaint.title}” (${complaint.reference})?`}
          pending={pending}
          onClose={() => setRejecting(false)}
        >
          <ModalBody>
            <p className="text-sm font-semibold">Alasan penolakan</p>
            <p className="rounded-summary bg-page p-4 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
              {note}
            </p>
            <p className="text-sm text-muted">
              Alasan ini dapat dibaca pengaju. Pengaduan yang ditolak tidak
              dapat diproses kembali.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              disabled={pending}
              onClick={() => setRejecting(false)}
              variant="outline"
            >
              Kembali
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                setRejecting(false)
                onReview({ complaint, action: 'reject', category, note })
              }}
              variant="danger"
            >
              Ya, Tolak Pengaduan
            </Button>
          </ModalFooter>
        </Modal>
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
    <Modal
      title="Detail Pengaduan"
      description={
        data
          ? `${data.reference} • ${complaintCategories[data.category]}`
          : undefined
      }
      onClose={close}
      pending={change.isPending}
    >
      <ModalBody>
        {detail.isPending ? (
          <p role="status">Memuat detail pengaduan…</p>
        ) : detail.isError ? (
          <div className="flex flex-col gap-4">
            <Feedback>{complaintError(detail.error)}</Feedback>
            <Button
              type="button"
              onClick={() => void detail.refetch()}
              variant="outline"
            >
              Coba lagi detail
            </Button>
          </div>
        ) : null}
        {data && !detail.isError ? (
          <>
            {location.state?.complaintSubmitted ? (
              <p
                role="status"
                className="rounded-control bg-success-soft p-3 text-sm text-success"
              >
                Pengaduan berhasil dikirim. Pantau penanganannya di halaman ini.
              </p>
            ) : null}
            {change.isSuccess ? (
              <p
                role="status"
                className="rounded-control bg-success-soft p-3 text-sm text-success"
              >
                Pengaduan berhasil diperbarui.
              </p>
            ) : null}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h3 className="min-w-0 flex-1 text-xl font-bold wrap-anywhere">
                {data.title}
              </h3>
              <ComplaintStatusBadge status={data.status} />
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm max-sm:grid-cols-1 [&_dd]:m-0 [&_dd]:font-semibold [&_dd]:wrap-anywhere [&_dt]:mb-1 [&_dt]:text-muted">
              {[
                ['Nama pengaju', data.identity_snapshot.full_name],
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
            <section aria-label="Deskripsi pengaduan">
              <h3 className="mb-2 text-sm font-semibold">
                Deskripsi pengaduan
              </h3>
              <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
                {data.description}
              </p>
            </section>
            {data.resolution_note ? (
              <section
                className="rounded-summary border border-border bg-page p-4"
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
              className="rounded-summary border border-border p-4 text-sm [&_li]:py-3 [&_p]:mt-1"
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
                        Kategori: {complaintCategories[event.previous_category]}{' '}
                        → {complaintCategories[event.category]}
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
              <div className="flex flex-col gap-3">
                <Feedback>{complaintError(change.error)}</Feedback>
                <Button
                  type="button"
                  onClick={async () => {
                    await detail.refetch()
                    await client.invalidateQueries({
                      queryKey: ['complaints', 'overview'],
                    })
                    change.reset()
                  }}
                  variant="outline"
                >
                  Muat ulang detail
                </Button>
              </div>
            ) : null}
            {manage &&
            data.status !== 'selesai' &&
            data.status !== 'ditolak' ? (
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
      </ModalBody>
      <ModalFooter>
        <Button
          type="button"
          disabled={change.isPending}
          onClick={close}
          variant="outline"
        >
          Tutup
        </Button>
      </ModalFooter>
    </Modal>
  )
}
