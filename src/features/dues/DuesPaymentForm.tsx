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
import styles from './styles'

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
        <div className={styles.feedback}>
          <Feedback>{duesError(detail.error ?? configuration.error)}</Feedback>
          <button
            type="button"
            className={styles.secondary}
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
        <div className={styles.feedback}>
          <Feedback>
            Tagihan tidak dapat dibayar karena sudah lunas, sedang diverifikasi,
            atau bukan milik Anda.
          </Feedback>
          <Link className={styles.secondary} to={`/warga/iuran-warga/${id}`}>
            Lihat detail tagihan
          </Link>
        </div>
      ) : (
        <form ref={formRef} onSubmit={submit} aria-busy={mutation.isPending}>
          <dl className={styles.paymentSummary}>
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
          <fieldset disabled={mutation.isPending} className={styles.formFields}>
            <legend className={styles.srOnly}>Konfirmasi pembayaran</legend>
            <fieldset className={styles.methods}>
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
              <p className={styles.notice}>
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
                <div className={styles.bank}>
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
                <div className={styles.upload}>
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
                    <span className={styles.fileName}>{file.name}</span>
                  ) : null}
                </div>
              </>
            ) : (
              <p className={styles.notice}>
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
            <p className={styles.helper}>
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
          <div className={styles.dialogActions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={mutation.isPending}
              onClick={close}
            >
              Batal
            </button>
            <button
              type="submit"
              className={styles.primary}
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
