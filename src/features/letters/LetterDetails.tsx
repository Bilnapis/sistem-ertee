import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Info } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button'
import { Feedback } from '../../components/Feedback'
import { formatDate, roleLabels } from '../residents/data'
import {
  advanceLetter,
  downloadAttachment,
  letterError,
  letterStatuses,
  useLetter,
  useLetterHistory,
} from './data'
import { Modal, ModalBody, ModalFooter } from '../../components/Modal'
import { LetterStatusBadge } from './LetterStatusBadge'

export default function LetterDetails({
  manage = false,
}: {
  manage?: boolean
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const client = useQueryClient()
  const request = useLetter(id, manage)
  const history = useLetterHistory(id ?? '', Boolean(request.data))
  const close = () =>
    navigate({
      pathname: `${manage ? '/admin' : '/warga'}/pengajuan-surat`,
      search: location.search,
    })
  const change = useMutation({
    mutationFn: async () => advanceLetter(request.data!),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['letters'] })
    },
  })
  const download = useMutation({
    mutationFn: async () => downloadAttachment(request.data!.attachment!),
  })
  const data = request.data
  return (
    <Modal
      title="Detail Pengajuan Surat"
      description={
        data
          ? `Permohonan #${data.reference} • ${letterStatuses[data.status]}`
          : undefined
      }
      onClose={close}
      pending={change.isPending}
    >
      {request.isPending ? (
        <ModalBody>
          <p
            className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-5 py-12 text-center leading-normal text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink"
            role="status"
          >
            Memuat pengajuan…
          </p>
        </ModalBody>
      ) : request.isError ? (
        <ModalBody>
          <div className="flex flex-col gap-4 py-3">
            <Feedback>{letterError(request.error)}</Feedback>
            <Button
              type="button"
              onClick={() => void request.refetch()}
              variant="outline"
            >
              Coba lagi
            </Button>
          </div>
        </ModalBody>
      ) : data ? (
        <>
          <ModalBody>
            {location.state?.letterSubmitted ? (
              <p
                className="rounded-control bg-success-soft px-4 py-3 text-sm leading-normal text-success"
                role="status"
              >
                Pengajuan berhasil dikirim. Anda dapat memantau statusnya di
                sini.
              </p>
            ) : null}
            <div>
              <LetterStatusBadge status={data.status} />
            </div>
            <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1 [&_dd]:m-0 [&_dd]:text-base [&_dd]:leading-normal [&_dd]:font-bold [&_dd]:wrap-anywhere [&_dd]:whitespace-pre-wrap [&_dt]:mb-1 [&_dt]:text-sm [&_dt]:leading-normal [&_dt]:font-semibold [&_dt]:text-muted">
              {[
                ['Nama Pemohon', data.identity_snapshot.full_name],
                ['Tanggal Pengajuan', formatDate(data.created_at)],
                ['Keperluan Surat', data.purpose],
                ['Keterangan Tambahan', data.additional_notes || '—'],
                ['Jenis Surat', data.letter_type_label],
                ['Status Pengajuan', letterStatuses[data.status]],
                ['Nomor HP Aktif', data.contact_phone],
                ['Alamat', data.identity_snapshot.address],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {data.attachment ? (
              <div className="flex items-center justify-between gap-4 rounded-summary border border-border p-4 text-sm leading-normal max-sm:flex-col max-sm:items-start [&_p]:mt-1 [&_p]:text-muted [&>div]:min-w-0 [&>div]:wrap-anywhere">
                <div>
                  <strong>Lampiran Pendukung</strong>
                  <p>
                    {data.attachment.name} ·{' '}
                    {Math.ceil(data.attachment.size / 1024)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={download.isPending}
                  onClick={() => download.mutate()}
                  variant="outline"
                  leadingIcon={<Download size={18} aria-hidden="true" />}
                >
                  {download.isPending ? 'Mengunduh…' : 'Unduh lampiran'}
                </Button>
              </div>
            ) : null}
            {download.isError ? (
              <Feedback>{letterError(download.error)}</Feedback>
            ) : null}
            <p className="flex items-start gap-3 rounded-summary border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-normal text-info [&>svg]:mt-0.5 [&>svg]:shrink-0">
              <Info size={20} aria-hidden="true" />
              <span>
                {data.status === 'selesai'
                  ? 'Pemrosesan surat telah selesai. Hubungi pengurus RT untuk penyerahan surat.'
                  : data.status === 'diproses'
                    ? 'Surat masih dalam proses pengerjaan secara manual di luar sistem WargaKita.'
                    : 'Surat diproses secara manual di luar sistem WargaKita.'}
              </span>
            </p>
            <details className="rounded-summary border border-border px-4 py-3 text-sm leading-normal [&_li]:py-2 [&_li]:ps-1 [&_li_p]:text-muted [&_li_time]:text-muted [&_ol]:mb-0 [&_ol]:list-decimal [&_ol]:ps-5 [&_summary]:cursor-pointer [&_summary]:font-semibold [&>div]:mt-3 [&>p]:mt-3">
              <summary>
                Riwayat status{history.data ? ` (${history.data.length})` : ''}
              </summary>
              {history.isPending ? (
                <p role="status">Memuat riwayat…</p>
              ) : history.isError ? (
                <>
                  <Feedback>{letterError(history.error)}</Feedback>
                  <Button
                    type="button"
                    onClick={() => void history.refetch()}
                    variant="ghost"
                    size="text"
                    align="start"
                  >
                    Coba lagi riwayat
                  </Button>
                </>
              ) : (
                <ol>
                  {history.data?.map((event) => (
                    <li key={event.id}>
                      <strong>{letterStatuses[event.status]}</strong>
                      <p>
                        {event.actor_name} · {roleLabels[event.actor_role]}
                      </p>
                      <time dateTime={event.occurred_at}>
                        {formatDate(event.occurred_at)}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </details>
            {change.isError ? (
              <div className="flex flex-col gap-2">
                <Feedback>{letterError(change.error)}</Feedback>
                <Button
                  type="button"
                  onClick={async () => {
                    await Promise.all([
                      request.refetch(),
                      history.refetch(),
                      client.invalidateQueries({ queryKey: ['letters'] }),
                    ])
                    change.reset()
                  }}
                  variant="ghost"
                  size="text"
                  align="start"
                >
                  Muat ulang detail
                </Button>
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              disabled={change.isPending}
              onClick={close}
            >
              {manage && data.status === 'diproses'
                ? 'Masih Diproses'
                : 'Tutup'}
            </Button>
            {manage && data.status !== 'selesai' ? (
              <Button
                type="button"
                variant="solid"
                disabled={
                  change.isPending || change.isError || request.isFetching
                }
                onClick={() => change.mutate()}
              >
                {change.isPending
                  ? 'Menyimpan…'
                  : data.status === 'pengajuan'
                    ? 'Mulai Proses'
                    : 'Selesai Diproses'}
              </Button>
            ) : null}
          </ModalFooter>
        </>
      ) : null}
    </Modal>
  )
}
