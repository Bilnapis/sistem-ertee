import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileUp } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Feedback } from '../../components/Feedback'
import { TextInput } from '../../components/TextInput'
import { getSupabase } from '../../lib/supabase'
import type { Json } from '../../lib/database.types'
import { useAuth } from '../auth/AuthProvider'
import {
  dateOnly,
  duesError,
  monthLabel,
  rupiah,
  todayWib,
  uploadProof,
  useDuesConfiguration,
  useDuesDetail,
  validateProof,
} from './data'
import type { DuesProof, PaymentMethod } from './types'
import { DuesModal } from './DuesModal'

export default function DuesPaymentForm() {
  const { id } = useParams(),
    { profile } = useAuth(),
    navigate = useNavigate(),
    location = useLocation(),
    client = useQueryClient()
  const detail = useDuesDetail(id),
    configuration = useDuesConfiguration()
  const [requestId] = useState(() => crypto.randomUUID()),
    [method, setMethod] = useState<PaymentMethod>('tunai'),
    [date, setDate] = useState(todayWib),
    [notes, setNotes] = useState(''),
    [file, setFile] = useState<File | null>(null),
    [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null),
    uploaded = useRef<{ file: File; proof: DuesProof } | null>(null)
  const invoice = detail.data?.invoice,
    bank = configuration.data
  const close = () =>
    navigate({ pathname: '/warga/iuran-warga', search: location.search })
  const mutation = useMutation({
    mutationFn: async () => {
      let proof: DuesProof | null = null
      if (method === 'transfer' && file) {
        proof =
          uploaded.current?.file === file
            ? uploaded.current.proof
            : await uploadProof(profile!.id, requestId, file)
        uploaded.current = { file, proof }
      }
      const { data, error } = await getSupabase().rpc('submit_dues_payment', {
        p_request_id: requestId,
        p_invoice_id: id!,
        p_method: method,
        p_payment_date: date,
        p_notes: notes.trim(),
        p_attachment: proof as Json,
      })
      if (error) throw error
      return data
    },
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: ['dues'] })
      navigate(
        {
          pathname: `/warga/iuran-warga/${result.invoice.id}`,
          search: location.search,
        },
        { replace: true, state: { paymentSubmitted: true } },
      )
    },
  })
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (mutation.isPending) return
    if (!formRef.current?.reportValidity()) return
    if (method === 'transfer' && (!bank?.bank_name || !file)) {
      setError(
        !bank?.bank_name
          ? 'Rekening transfer belum diatur pengurus.'
          : 'Unggah bukti pembayaran transfer.',
      )
      return
    }
    if (method === 'transfer' && file) {
      const invalid = validateProof(file)
      if (invalid) {
        setError(invalid)
        return
      }
    }
    mutation.mutate()
  }
  const failed = detail.isError || configuration.isError
  return (
    <DuesModal
      title="Pembayaran Iuran"
      onClose={close}
      pending={mutation.isPending}
    >
      {failed ? (
        <div className="flex flex-col items-start gap-3">
          <Feedback>{duesError(detail.error ?? configuration.error)}</Feedback>
          <button
            type="button"
            className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
            onClick={() => {
              void detail.refetch()
              void configuration.refetch()
            }}
          >
            Coba lagi
          </button>
        </div>
      ) : !invoice || !bank ? (
        <p role="status">Memuat tagihan…</p>
      ) : invoice.status !== 'belum_bayar' ||
        invoice.resident_id !== profile?.id ? (
        <div className="flex flex-col items-start gap-3">
          <Feedback>
            Tagihan tidak dapat dibayar karena sudah lunas, sedang diverifikasi,
            atau bukan milik Anda.
          </Feedback>
          <Link
            className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
            to={`/warga/iuran-warga/${id}`}
          >
            Lihat detail tagihan
          </Link>
        </div>
      ) : (
        <form ref={formRef} onSubmit={submit} aria-busy={mutation.isPending}>
          <dl className="m-0 mt-5 rounded-summary bg-page p-5 [&_dd]:m-0 [&_dd]:min-w-0 [&_dd]:text-end [&_dd]:font-bold [&_dd]:wrap-anywhere max-sm:[&_dd]:text-start [&_dt]:text-muted [&>div]:flex [&>div]:items-baseline [&>div]:justify-between [&>div]:gap-4 [&>div]:text-base [&>div]:leading-relaxed max-sm:[&>div]:mb-2 max-sm:[&>div]:flex-col max-sm:[&>div]:gap-0">
            <div>
              <dt>Nama Warga</dt>
              <dd>{invoice.identity_snapshot.full_name}</dd>
            </div>
            <div>
              <dt>Periode Pembayaran</dt>
              <dd>{monthLabel(invoice.period)}</dd>
            </div>
            <div>
              <dt>Total Tagihan</dt>
              <dd>{rupiah(invoice.amount)}</dd>
            </div>
          </dl>
          <fieldset
            disabled={mutation.isPending}
            className="flex min-w-0 flex-col gap-4 border-0 p-0"
          >
            <legend className="sr-only">Konfirmasi pembayaran</legend>
            <fieldset className="flex flex-wrap gap-3 border-0 p-0 [&_input]:size-[18px] [&_input]:accent-action [&_label]:flex [&_label]:min-h-12 [&_label]:min-w-0 [&_label]:flex-1 [&_label]:items-center [&_label]:gap-3 [&_label]:rounded-control [&_label]:border [&_label]:border-border [&_label]:px-4 [&_label]:py-3 [&_label]:font-semibold forced-colors:[&_label]:border-[CanvasText] [&_label:has(input:checked)]:border-action [&_label:has(input:checked)]:bg-emerald-50 [&_label:has(input:disabled)]:text-muted [&_legend]:mb-2 [&_legend]:text-sm [&_legend]:leading-normal [&_legend]:font-semibold">
              <legend>Metode pembayaran</legend>
              <label>
                <input
                  type="radio"
                  name="method"
                  value="tunai"
                  checked={method === 'tunai'}
                  onChange={() => setMethod('tunai')}
                />
                Tunai/Cash
              </label>
              <label>
                <input
                  type="radio"
                  name="method"
                  value="transfer"
                  disabled={!bank.bank_name}
                  checked={method === 'transfer'}
                  onChange={() => setMethod('transfer')}
                />
                Transfer
              </label>
            </fieldset>
            {!bank.bank_name ? (
              <p className="block rounded-summary bg-amber-50 p-4 text-sm leading-relaxed wrap-anywhere text-warning forced-colors:border forced-colors:border-[CanvasText]">
                Transfer belum tersedia. Rekening belum dikonfigurasi pengurus.
                Pembayaran Tunai/Cash tetap tersedia.
              </p>
            ) : null}
            {method === 'transfer' ? (
              <>
                <p>
                  Silakan transfer sesuai nominal tagihan ke rekening pengurus
                  RT.
                </p>
                <div className="rounded-summary bg-page p-4 text-sm leading-relaxed wrap-anywhere text-slate-700">
                  <p>
                    Nama Bank: <strong>{bank.bank_name}</strong>
                  </p>
                  <p>
                    Nomor Rekening: <strong>{bank.bank_account}</strong>
                  </p>
                  <p>
                    Atas Nama: <strong>{bank.bank_holder}</strong>
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-summary border border-border bg-page p-5 text-center [&_input]:max-w-full [&_input]:text-sm [&_input]:file:me-2 [&_input]:file:cursor-pointer [&_input]:file:rounded-lg [&_input]:file:border [&_input]:file:border-border [&_input]:file:bg-surface [&_input]:file:p-2 [&_input]:file:font-semibold [&_input]:file:text-action [&_label]:text-sm [&_label]:font-bold [&_p]:text-xs [&_p]:text-muted">
                  <FileUp size={24} aria-hidden="true" />
                  <label htmlFor="dues-proof">
                    Unggah Bukti Pembayaran <span aria-hidden="true">*</span>
                  </label>
                  <p id="dues-proof-help">JPG, PNG, PDF · Maksimal 5 MB</p>
                  <input
                    id="dues-proof"
                    type="file"
                    accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
                    required
                    aria-describedby="dues-proof-help payment-form-error"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] ?? null)
                      setError('')
                    }}
                  />
                  {file ? (
                    <span className="text-sm wrap-anywhere">{file.name}</span>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="block rounded-summary bg-amber-50 p-4 text-sm leading-relaxed wrap-anywhere text-warning forced-colors:border forced-colors:border-[CanvasText]">
                Serahkan uang tunai kepada pengurus terlebih dahulu, lalu kirim
                konfirmasi ini. Status menjadi Lunas setelah pengurus memastikan
                uang sudah diterima. Bukti pembayaran tidak diperlukan.
              </p>
            )}
            <TextInput
              label="Tanggal pembayaran"
              type="date"
              required
              min="2000-01-01"
              max={todayWib()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <TextInput
              label="Catatan pembayaran (opsional)"
              maxLength={2000}
              placeholder="Tambahkan keterangan pembayaran"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <p className="text-xs leading-relaxed text-muted">
              Jatuh tempo {dateOnly(invoice.due_date)}. Konfirmasi tidak
              langsung mengubah status menjadi Lunas.
            </p>
          </fieldset>
          {error || mutation.isError ? (
            <div id="payment-form-error">
              <Feedback>{error || duesError(mutation.error)}</Feedback>
            </div>
          ) : (
            <span id="payment-form-error" />
          )}
          <div className="mt-5 flex flex-wrap items-center gap-4 [&>*]:flex-[1_1_12rem]">
            <button
              type="button"
              className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
              disabled={mutation.isPending}
              onClick={close}
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-action px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-white enabled:cursor-pointer enabled:hover:bg-action-hover disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 forced-colors:border-[ButtonText] [&>svg]:shrink-0"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? 'Mengirim…'
                : method === 'transfer'
                  ? 'Kirim Bukti Pembayaran'
                  : 'Kirim Konfirmasi Tunai'}
            </button>
          </div>
        </form>
      )}
    </DuesModal>
  )
}
