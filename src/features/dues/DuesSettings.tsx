import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { Feedback } from '../../components/Feedback'
import { TextInput } from '../../components/TextInput'
import { getSupabase } from '../../lib/supabase'
import { duesError, monthLabel, rupiah, useDuesConfiguration } from './data'
import type { DuesConfiguration } from './types'
import { DuesModal } from './DuesModal'

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
        <p className="block rounded-summary bg-amber-50 p-4 text-sm leading-relaxed wrap-anywhere text-warning forced-colors:border forced-colors:border-[CanvasText]">
          Tarif bulan ini {rupiah(config.current_rate.amount)}, jatuh tempo
          tanggal {config.current_rate.due_day}. Perubahan tarif dan jatuh tempo
          berlaku mulai <strong>{monthLabel(config.next_month)}</strong>.
          Tagihan yang sudah terbit tetap.
        </p>
        <fieldset
          className="flex min-w-0 flex-col gap-4 border-0 p-0"
          disabled={mutation.isPending}
        >
          <legend className="sr-only">Tarif dan rekening iuran</legend>
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
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
          <p className="text-xs leading-relaxed text-muted">
            Jika tanggal tidak ada pada suatu bulan, jatuh tempo mengikuti hari
            terakhir bulan itu.
          </p>
          <h3>Rekening penerima transfer</h3>
          <p className="text-xs leading-relaxed text-muted">
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
      ) : (
        <p role="status">Memuat pengaturan…</p>
      )}
    </DuesModal>
  )
}
