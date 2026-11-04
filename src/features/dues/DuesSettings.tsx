import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { Feedback } from '../../components/Feedback'
import { TextInput } from '../../components/TextInput'
import { getSupabase } from '../../lib/supabase'
import { duesError, monthLabel, rupiah, useDuesConfiguration } from './data'
import type { DuesConfiguration } from './types'
import { DuesModal } from './DuesModal'
import styles from './Dues.module.css'

function SettingsForm({
  config,
  close,
}: {
  config: DuesConfiguration
  close: () => void
}) {
  const client = useQueryClient()
  const [amount, setAmount] = useState(String(config.next_rate.amount)),
    [day, setDay] = useState(String(config.next_rate.due_day)),
    [bank, setBank] = useState(config.bank_name),
    [account, setAccount] = useState(config.bank_account),
    [holder, setHolder] = useState(config.bank_holder),
    [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await getSupabase().rpc(
        'update_dues_configuration',
        {
          p_amount: Number(amount),
          p_due_day: Number(day),
          p_bank_name: bank.trim(),
          p_bank_account: account.trim(),
          p_bank_holder: holder.trim(),
          p_expected_updated_at: config.updated_at,
        },
      )
      if (error) throw error
      return data
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['dues'] })
      close()
    },
  })
  return (
    <DuesModal
      title="Pengaturan Iuran"
      onClose={close}
      pending={mutation.isPending}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          if (mutation.isPending) return
          if (
            [bank, account, holder].some((value) => value.trim()) &&
            ![bank, account, holder].every((value) => value.trim())
          ) {
            setError(
              'Lengkapi ketiga informasi rekening atau kosongkan semuanya untuk menonaktifkan transfer.',
            )
            return
          }
          mutation.mutate()
        }}
        aria-busy={mutation.isPending}
      >
        <p className={styles.notice}>
          Tarif bulan ini {rupiah(config.current_rate.amount)}, jatuh tempo
          tanggal {config.current_rate.due_day}. Perubahan tarif dan jatuh tempo
          berlaku mulai <strong>{monthLabel(config.next_month)}</strong>.
          Tagihan yang sudah terbit tetap.
        </p>
        <fieldset className={styles.formFields} disabled={mutation.isPending}>
          <legend className={styles.srOnly}>Tarif dan rekening iuran</legend>
          <div className={styles.twoColumns}>
            <TextInput
              label="Tarif bulanan (Rp)"
              type="number"
              min="1"
              max="999999999999"
              step="1"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <TextInput
              label="Tanggal jatuh tempo"
              type="number"
              min="1"
              max="31"
              step="1"
              required
              value={day}
              onChange={(event) => setDay(event.target.value)}
            />
          </div>
          <p className={styles.helper}>
            Jika tanggal tidak ada pada suatu bulan, jatuh tempo mengikuti hari
            terakhir bulan itu.
          </p>
          <h3>Rekening penerima transfer</h3>
          <p className={styles.helper}>
            Perubahan rekening berlaku untuk konfirmasi baru. Riwayat tujuan
            transfer yang sudah dikirim tetap tersimpan. Kosongkan semua kolom
            rekening untuk menonaktifkan transfer.
          </p>
          <TextInput
            label="Nama bank"
            maxLength={100}
            value={bank}
            onChange={(event) => setBank(event.target.value)}
          />
          <TextInput
            label="Nomor rekening"
            inputMode="numeric"
            pattern="[0-9]{5,50}"
            maxLength={50}
            value={account}
            onChange={(event) => setAccount(event.target.value)}
          />
          <TextInput
            label="Atas nama"
            maxLength={150}
            value={holder}
            onChange={(event) => setHolder(event.target.value)}
          />
        </fieldset>
        {error || mutation.isError ? (
          <Feedback>{error || duesError(mutation.error)}</Feedback>
        ) : null}
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
            {mutation.isPending ? 'Menyimpan…' : 'Simpan pengaturan'}
          </button>
        </div>
      </form>
    </DuesModal>
  )
}
export default function DuesSettings() {
  const query = useDuesConfiguration(),
    navigate = useNavigate(),
    location = useLocation()
  const close = () =>
    navigate({ pathname: '/admin/iuran-warga', search: location.search })
  if (query.data)
    return (
      <SettingsForm
        key={query.data.updated_at}
        config={query.data}
        close={close}
      />
    )
  return (
    <DuesModal title="Pengaturan Iuran" onClose={close}>
      {query.isError ? (
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
      ) : (
        <p role="status">Memuat pengaturan…</p>
      )}
    </DuesModal>
  )
}
