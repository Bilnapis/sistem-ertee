import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Info } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
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
import { LetterModal } from './LetterModal'
import { LetterStatusBadge } from './LetterStatusBadge'
import styles from './styles'

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
    <LetterModal
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
        <p className={styles.empty} role="status">
          Memuat pengajuan…
        </p>
      ) : request.isError ? (
        <div className={styles.blocked}>
          <Feedback>{letterError(request.error)}</Feedback>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => void request.refetch()}
          >
            Coba lagi
          </button>
        </div>
      ) : data ? (
        <>
          {location.state?.letterSubmitted ? (
            <p className={styles.success} role="status">
              Pengajuan berhasil dikirim. Anda dapat memantau statusnya di sini.
            </p>
          ) : null}
          <div className={styles.detailStatus}>
            <LetterStatusBadge status={data.status} />
          </div>
          <dl className={styles.details}>
            {[
              ['Nama Pemohon', data.identity_snapshot.full_name],
              ['Tanggal Pengajuan', formatDate(data.created_at)],
              ['Blok Rumah', data.identity_snapshot.house_block],
              ['Keperluan Surat', data.purpose],
              [
                'Nomor Rumah',
                data.identity_snapshot.house_number ?? 'Belum diisi',
              ],
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
            <div className={styles.attachment}>
              <div>
                <strong>Lampiran Pendukung</strong>
                <p>
                  {data.attachment.name} ·{' '}
                  {Math.ceil(data.attachment.size / 1024)} KB
                </p>
              </div>
              <button
                type="button"
                className={styles.secondary}
                disabled={download.isPending}
                onClick={() => download.mutate()}
              >
                <Download size={18} aria-hidden="true" />
                {download.isPending ? 'Mengunduh…' : 'Unduh lampiran'}
              </button>
            </div>
          ) : null}
          {download.isError ? (
            <Feedback>{letterError(download.error)}</Feedback>
          ) : null}
          <p className={styles.notice}>
            <Info size={20} aria-hidden="true" />
            <span>
              {data.status === 'selesai'
                ? 'Pemrosesan surat telah selesai. Hubungi pengurus RT untuk penyerahan surat.'
                : data.status === 'diproses'
                  ? 'Surat masih dalam proses pengerjaan secara manual di luar sistem ErTee.'
                  : 'Surat diproses secara manual di luar sistem ErTee.'}
            </span>
          </p>
          <details className={styles.history}>
            <summary>
              Riwayat status{history.data ? ` (${history.data.length})` : ''}
            </summary>
            {history.isPending ? (
              <p role="status">Memuat riwayat…</p>
            ) : history.isError ? (
              <>
                <Feedback>{letterError(history.error)}</Feedback>
                <button
                  type="button"
                  className={styles.textLink}
                  onClick={() => void history.refetch()}
                >
                  Coba lagi riwayat
                </button>
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
            <div className={styles.feedback}>
              <Feedback>{letterError(change.error)}</Feedback>
              <button
                type="button"
                className={styles.textLink}
                onClick={async () => {
                  await Promise.all([
                    request.refetch(),
                    history.refetch(),
                    client.invalidateQueries({ queryKey: ['letters'] }),
                  ])
                  change.reset()
                }}
              >
                Muat ulang detail
              </button>
            </div>
          ) : null}
          <div className={styles.detailActions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={change.isPending}
              onClick={close}
            >
              {manage && data.status === 'diproses'
                ? 'Masih Diproses'
                : 'Tutup'}
            </button>
            {manage && data.status !== 'selesai' ? (
              <button
                type="button"
                className={styles.primary}
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
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </LetterModal>
  )
}
