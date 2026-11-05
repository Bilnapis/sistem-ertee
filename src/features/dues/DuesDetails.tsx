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
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalButton,
} from '../../components/Modal'

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
    <Modal title="Detail Iuran" onClose={close} pending={review.isPending}>
      {query.isPending ? (
        <ModalBody>
          <p role="status">Memuat detail tagihan…</p>
        </ModalBody>
      ) : query.isError ? (
        <ModalBody>
          <div className="flex flex-col items-start gap-3">
            <Feedback>{duesError(query.error)}</Feedback>
            <button
              type="button"
              className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
              onClick={() => void query.refetch()}
            >
              Coba lagi
            </button>
          </div>
        </ModalBody>
      ) : detail ? (
        <>
          <ModalBody>
            {location.state?.paymentSubmitted ? (
              <p
                className="flex items-center gap-3 rounded-summary bg-emerald-50 p-4 text-sm leading-relaxed wrap-anywhere text-success forced-colors:border forced-colors:border-[CanvasText] [&>svg]:shrink-0"
                role="status"
              >
                Konfirmasi pembayaran terkirim. Tunggu verifikasi pengurus.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-lg font-bold">
                {monthLabel(detail.invoice.period)}
              </h3>
              <DuesStatusBadge status={detail.invoice.status} />
            </div>
            <dl className="m-0 rounded-summary bg-page p-5 [&_dd]:m-0 [&_dd]:min-w-0 [&_dd]:text-end [&_dd]:font-bold [&_dd]:wrap-anywhere max-sm:[&_dd]:text-start [&_dt]:text-muted [&>div]:flex [&>div]:items-baseline [&>div]:justify-between [&>div]:gap-4 [&>div]:text-base [&>div]:leading-relaxed max-sm:[&>div]:mb-2 max-sm:[&>div]:flex-col max-sm:[&>div]:gap-0">
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
                className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-action px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-white enabled:cursor-pointer enabled:hover:bg-action-hover disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 forced-colors:border-[ButtonText] [&>svg]:shrink-0"
                to={{
                  pathname: `${base}/${id}/bayar`,
                  search: location.search,
                }}
              >
                Bayar Iuran
              </Link>
            ) : null}
            <section className="flex flex-col gap-3">
              <h3 className="text-lg font-bold">Konfirmasi pembayaran</h3>
              {!detail.payments.length ? (
                <p className="text-xs leading-relaxed text-muted">
                  Belum ada konfirmasi pembayaran.
                </p>
              ) : (
                detail.payments.map((payment) => (
                  <article
                    className="flex flex-col gap-3 rounded-summary border border-border p-5 [&_p]:text-sm [&_p]:leading-relaxed"
                    key={payment.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <strong>{paymentMethods[payment.method]}</strong>
                      <span
                        className="text-xs font-bold text-warning data-[status=dibatalkan]:text-danger data-[status=disetujui]:text-success data-[status=ditolak]:text-danger"
                        data-status={payment.status}
                      >
                        {paymentStatuses[payment.status]}
                      </span>
                    </div>
                    <p>Tanggal pembayaran: {dateOnly(payment.payment_date)}</p>
                    <p className="text-xs leading-relaxed text-muted">
                      Dikirim {formatDate(payment.created_at)}
                    </p>
                    {payment.notes ? (
                      <p className="wrap-anywhere whitespace-pre-wrap">
                        {payment.notes}
                      </p>
                    ) : null}
                    {payment.bank_snapshot ? (
                      <p className="text-xs leading-relaxed text-muted">
                        Tujuan transfer: {payment.bank_snapshot.bank_name} ·{' '}
                        {payment.bank_snapshot.bank_account} ·{' '}
                        {payment.bank_snapshot.bank_holder}
                      </p>
                    ) : null}
                    {payment.attachment ? (
                      <button
                        type="button"
                        className="inline-flex min-h-11 max-w-full items-center gap-2 border-0 bg-transparent p-0 text-start text-sm leading-5 font-bold wrap-anywhere text-action hover:underline disabled:cursor-wait disabled:opacity-65 [&>svg]:shrink-0"
                        disabled={download.isPending}
                        onClick={() => download.mutate(payment.attachment!)}
                      >
                        <Download size={17} aria-hidden="true" />
                        Unduh bukti: {payment.attachment.name}
                      </button>
                    ) : (
                      <p className="text-xs leading-relaxed text-muted">
                        Pembayaran tunai tanpa lampiran.
                      </p>
                    )}
                    {payment.reviewed_at ? (
                      <p className="text-xs leading-relaxed text-muted">
                        Diperiksa {formatDate(payment.reviewed_at)}
                      </p>
                    ) : null}
                    {payment.review_note ? (
                      <p className="block rounded-summary bg-amber-50 p-4 text-sm leading-relaxed wrap-anywhere text-warning forced-colors:border forced-colors:border-[CanvasText]">
                        Catatan pengurus: {payment.review_note}
                      </p>
                    ) : null}
                    {payment.cancelled_at ? (
                      <p className="block rounded-summary bg-amber-50 p-4 text-sm leading-relaxed wrap-anywhere text-warning forced-colors:border forced-colors:border-[CanvasText]">
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
                className="flex flex-col gap-3 rounded-summary border border-border p-5"
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
                    sejumlah {rupiah(detail.invoice.amount)} sebelum
                    mengesahkan.
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
                  <div className="rounded-control bg-orange-50 p-4 text-sm leading-relaxed">
                    <p>
                      {action === 'ditolak'
                        ? 'Tolak konfirmasi dan minta warga mengirim ulang pembayaran?'
                        : 'Batalkan pembayaran yang sudah disahkan beserta pemasukan kas tertaut?'}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-4 [&>*]:flex-[1_1_12rem]">
                      <button
                        type="button"
                        className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
                        disabled={review.isPending}
                        onClick={() => setAction(null)}
                      >
                        Kembali
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-danger bg-danger px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-white enabled:cursor-pointer enabled:hover:bg-red-800 disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 forced-colors:border-[ButtonText] [&>svg]:shrink-0"
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
                  <div className="mt-5 flex flex-wrap items-center gap-4 [&>*]:flex-[1_1_12rem]">
                    {active.status === 'diajukan' ? (
                      <>
                        <button
                          type="button"
                          className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
                          disabled={review.isPending}
                          onClick={() => setAction('ditolak')}
                        >
                          Tolak konfirmasi
                        </button>
                        <button
                          type="button"
                          className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-action px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-white enabled:cursor-pointer enabled:hover:bg-action-hover disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 forced-colors:border-[ButtonText] [&>svg]:shrink-0"
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
                        className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-danger bg-danger px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-white enabled:cursor-pointer enabled:hover:bg-red-800 disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 forced-colors:border-[ButtonText] [&>svg]:shrink-0"
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
            <section className="flex flex-col gap-3">
              <h3 className="text-lg font-bold">Riwayat tindakan</h3>
              {detail.events.length ? (
                <ol className="m-0 list-disc ps-5 text-sm leading-relaxed [&_li]:ps-2 [&_li]:pb-4 [&_time]:text-xs [&_time]:text-muted">
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
                        <p className="wrap-anywhere whitespace-pre-wrap">
                          {event.note}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs leading-relaxed text-muted">
                  Belum ada tindakan pembayaran.
                </p>
              )}
            </section>
          </ModalBody>
          <ModalFooter>
            <ModalButton
              type="button"
              variant="secondary"
              disabled={query.isFetching || review.isPending}
              onClick={() => void query.refetch()}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Muat ulang
            </ModalButton>
            <ModalButton
              type="button"
              variant="primary"
              disabled={review.isPending}
              onClick={close}
            >
              Tutup
            </ModalButton>
          </ModalFooter>
        </>
      ) : null}
    </Modal>
  )
}
