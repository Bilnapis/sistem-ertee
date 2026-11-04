import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, RefreshCw } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Feedback } from '../../components/Feedback'
import { useAuth } from '../auth/AuthProvider'
import { TextInput } from '../../components/TextInput'
import { getSupabase } from '../../lib/supabase'
import { formatDate, roleLabels } from '../residents/data'
import type { ResidentRole } from '../../lib/database.types'
import {
  dateOnly,
  downloadProof,
  duesError,
  monthLabel,
  paymentMethods,
  paymentStatuses,
  rupiah,
  useDuesDetail,
} from './data'
import type { PaymentStatus } from './types'
import { DuesStatusBadge } from './DuesStatusBadge'
import { DuesModal } from './DuesModal'
import styles from './Dues.module.css'

export default function DuesDetails({ manage = false }: { manage?: boolean }) {
  const { profile } = useAuth()
  const { id } = useParams(),
    query = useDuesDetail(id),
    navigate = useNavigate(),
    location = useLocation(),
    client = useQueryClient()
  const [note, setNote] = useState(''),
    [action, setAction] = useState<PaymentStatus | null>(null),
    [validation, setValidation] = useState('')
  const base = `${manage ? '/admin' : '/warga'}/iuran-warga`,
    detail = query.data
  const active = detail?.payments.find((payment) =>
    ['diajukan', 'disetujui'].includes(payment.status),
  )
  const close = () => navigate({ pathname: base, search: location.search })
  const review = useMutation({
    mutationFn: async (selected: PaymentStatus) => {
      const { data, error } = await getSupabase().rpc('review_dues_payment', {
        p_payment_id: active!.id,
        p_action: selected,
        p_note: note.trim(),
        p_expected_updated_at: active!.updated_at,
      })
      if (error) throw error
      return data
    },
    onSuccess: async (result) => {
      client.setQueryData(['dues', 'detail', profile?.id, id], result)
      await client.invalidateQueries({ queryKey: ['dues'] })
      setNote('')
      setAction(null)
      setValidation('')
    },
  })
  const download = useMutation({ mutationFn: downloadProof })
  function submitAction(selected: PaymentStatus) {
    setValidation('')
    if (selected !== 'disetujui' && !note.trim()) {
      setValidation('Isi alasan penolakan atau pembatalan.')
      return
    }
    review.mutate(selected)
  }
  return (
    <DuesModal title="Detail Iuran" onClose={close} pending={review.isPending}>
      {query.isPending ? (
        <p role="status">Memuat detail tagihan…</p>
      ) : query.isError ? (
        <div className={styles.feedback}>
          <Feedback>{duesError(query.error)}</Feedback>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => void query.refetch()}
          >
            Coba lagi
          </button>
        </div>
      ) : detail ? (
        <>
          {location.state?.paymentSubmitted ? (
            <p className={styles.success} role="status">
              Konfirmasi pembayaran terkirim. Tunggu verifikasi pengurus.
            </p>
          ) : null}
          <div className={styles.billHeading}>
            <h3>{monthLabel(detail.invoice.period)}</h3>
            <DuesStatusBadge status={detail.invoice.status} />
          </div>
          <dl className={styles.paymentSummary}>
            <div>
              <dt>Nama Warga</dt>
              <dd>{detail.invoice.identity_snapshot.full_name}</dd>
            </div>
            <div>
              <dt>Blok Rumah</dt>
              <dd>
                {[
                  detail.invoice.identity_snapshot.house_block,
                  detail.invoice.identity_snapshot.house_number,
                ]
                  .filter(Boolean)
                  .join(' / ')}
              </dd>
            </div>
            <div>
              <dt>Nominal</dt>
              <dd>{rupiah(detail.invoice.amount)}</dd>
            </div>
            <div>
              <dt>Jatuh Tempo</dt>
              <dd>{dateOnly(detail.invoice.due_date)}</dd>
            </div>
          </dl>
          {!manage && detail.invoice.status === 'belum_bayar' ? (
            <Link
              className={styles.primary}
              to={{ pathname: `${base}/${id}/bayar`, search: location.search }}
            >
              Bayar Iuran
            </Link>
          ) : null}
          <section className={styles.detailSection}>
            <h3>Konfirmasi pembayaran</h3>
            {!detail.payments.length ? (
              <p className={styles.helper}>Belum ada konfirmasi pembayaran.</p>
            ) : (
              detail.payments.map((payment) => (
                <article className={styles.attempt} key={payment.id}>
                  <div className={styles.billHeading}>
                    <strong>{paymentMethods[payment.method]}</strong>
                    <span
                      className={styles.attemptStatus}
                      data-status={payment.status}
                    >
                      {paymentStatuses[payment.status]}
                    </span>
                  </div>
                  <p>Tanggal pembayaran: {dateOnly(payment.payment_date)}</p>
                  <p className={styles.helper}>
                    Dikirim {formatDate(payment.created_at)}
                  </p>
                  {payment.notes ? (
                    <p className={styles.preWrap}>{payment.notes}</p>
                  ) : null}
                  {payment.bank_snapshot ? (
                    <p className={styles.helper}>
                      Tujuan transfer: {payment.bank_snapshot.bank_name} ·{' '}
                      {payment.bank_snapshot.bank_account} ·{' '}
                      {payment.bank_snapshot.bank_holder}
                    </p>
                  ) : null}
                  {payment.attachment ? (
                    <button
                      type="button"
                      className={styles.textLink}
                      disabled={download.isPending}
                      onClick={() => download.mutate(payment.attachment!)}
                    >
                      <Download size={17} aria-hidden="true" />
                      Unduh bukti: {payment.attachment.name}
                    </button>
                  ) : (
                    <p className={styles.helper}>
                      Pembayaran tunai tanpa lampiran.
                    </p>
                  )}
                  {payment.reviewed_at ? (
                    <p className={styles.helper}>
                      Diperiksa {formatDate(payment.reviewed_at)}
                    </p>
                  ) : null}
                  {payment.review_note ? (
                    <p className={styles.notice}>
                      Catatan pengurus: {payment.review_note}
                    </p>
                  ) : null}
                  {payment.cancelled_at ? (
                    <p className={styles.notice}>
                      Dibatalkan {formatDate(payment.cancelled_at)}. Alasan:{' '}
                      {payment.cancellation_note}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </section>
          {download.isError ? (
            <Feedback>{duesError(download.error)}</Feedback>
          ) : null}
          {manage && active ? (
            <section
              className={styles.review}
              aria-labelledby="dues-review-title"
            >
              <h3 id="dues-review-title">
                {active.status === 'diajukan'
                  ? 'Verifikasi pembayaran'
                  : 'Koreksi pembayaran'}
              </h3>
              {active.status === 'diajukan' ? (
                <p>
                  Pastikan{' '}
                  {active.method === 'tunai'
                    ? 'uang tunai sudah diterima'
                    : 'transfer sudah masuk dan sesuai bukti'}{' '}
                  sejumlah {rupiah(detail.invoice.amount)} sebelum mengesahkan.
                </p>
              ) : (
                <p>
                  Pembatalan mengembalikan tagihan menjadi Belum Bayar dan
                  mengeluarkan pemasukan ini dari rekap kas. Riwayat tetap
                  tersimpan.
                </p>
              )}
              <TextInput
                label="Catatan pengurus / alasan"
                maxLength={2000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                error={validation || undefined}
                disabled={review.isPending}
              />
              {review.isError ? (
                <Feedback>{duesError(review.error)}</Feedback>
              ) : null}
              {action ? (
                <div className={styles.confirmation}>
                  <p>
                    {action === 'ditolak'
                      ? 'Tolak konfirmasi dan minta warga mengirim ulang pembayaran?'
                      : 'Batalkan pembayaran yang sudah disahkan beserta pemasukan kas tertaut?'}
                  </p>
                  <div className={styles.dialogActions}>
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={review.isPending}
                      onClick={() => setAction(null)}
                    >
                      Kembali
                    </button>
                    <button
                      type="button"
                      className={styles.danger}
                      disabled={review.isPending}
                      onClick={() => submitAction(action)}
                    >
                      {review.isPending
                        ? 'Menyimpan…'
                        : action === 'ditolak'
                          ? 'Ya, tolak konfirmasi'
                          : 'Ya, batalkan pembayaran'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.dialogActions}>
                  {active.status === 'diajukan' ? (
                    <>
                      <button
                        type="button"
                        className={styles.secondary}
                        disabled={review.isPending}
                        onClick={() => setAction('ditolak')}
                      >
                        Tolak konfirmasi
                      </button>
                      <button
                        type="button"
                        className={styles.primary}
                        disabled={review.isPending}
                        onClick={() => submitAction('disetujui')}
                      >
                        {review.isPending
                          ? 'Mengesahkan…'
                          : 'Sahkan pembayaran'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.danger}
                      disabled={review.isPending}
                      onClick={() => setAction('dibatalkan')}
                    >
                      Batalkan pembayaran
                    </button>
                  )}
                </div>
              )}
            </section>
          ) : null}
          <section className={styles.detailSection}>
            <h3>Riwayat tindakan</h3>
            {detail.events.length ? (
              <ol className={styles.timeline}>
                {detail.events.map((event) => (
                  <li key={event.id}>
                    <strong>
                      {paymentStatuses[event.action as PaymentStatus] ??
                        event.action}
                    </strong>
                    <p>
                      {event.actor_name} ·{' '}
                      {roleLabels[event.actor_role as ResidentRole] ??
                        event.actor_role}
                    </p>
                    <time dateTime={event.occurred_at}>
                      {formatDate(event.occurred_at)}
                    </time>
                    {event.note ? (
                      <p className={styles.preWrap}>{event.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.helper}>Belum ada tindakan pembayaran.</p>
            )}
          </section>
          <div className={styles.dialogActions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={query.isFetching || review.isPending}
              onClick={() => void query.refetch()}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Muat ulang
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={review.isPending}
              onClick={close}
            >
              Tutup
            </button>
          </div>
        </>
      ) : null}
    </DuesModal>
  )
}
