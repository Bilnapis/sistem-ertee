import { cn } from '../../lib/cn'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { Button, ButtonLink } from '../../components/Button'
import { Feedback } from '../../components/Feedback'
import { ModalBody, ModalFooter } from '../../components/Modal'
import type { ResidentProfile } from '../../lib/database.types'
import {
  archiveResident,
  formatDate,
  genderLabels,
  initials,
  maritalLabels,
  maskIdentity,
  residentError,
  reviewResident,
  roleLabels,
  statusLabels,
  useRefreshResidents,
  useResidentHistory,
} from './data'

const eventLabels: Record<string, string> = {
  created: 'Data warga ditambahkan',
  profile_updated: 'Identitas diperbarui',
  access_updated: 'Role atau status akun diubah',
  archived: 'Data diarsipkan',
  restored: 'Arsip dipulihkan',
  reviewed: 'Status verifikasi diperbarui',
}
export function ResidentHistory({ id }: { id: string }) {
  const history = useResidentHistory(id)
  return (
    <section
      className="border-t border-border pt-5 text-sm leading-relaxed [&_h3]:mb-3 [&_h3]:text-base [&_h3]:font-bold [&_li_p]:wrap-anywhere [&_li_p]:text-muted [&_ol]:flex [&_ol]:max-h-75 [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-4 [&_ol]:overflow-auto [&_ol]:ps-5"
      aria-label="Riwayat perubahan"
    >
      <h3>Riwayat perubahan</h3>
      {history.isPending ? (
        <p role="status">Memuat riwayat…</p>
      ) : history.isError ? (
        <>
          <Feedback>Riwayat belum dapat dimuat.</Feedback>
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
      ) : !history.data?.length ? (
        <p>Belum ada riwayat perubahan.</p>
      ) : (
        <ol>
          {history.data.map((event) => (
            <li key={event.id}>
              <strong>{eventLabels[event.action] ?? 'Data diperbarui'}</strong>
              <p>
                {event.actor_name ?? 'Administrator'} ·{' '}
                {formatDate(event.occurred_at)}
              </p>
              {typeof event.details.status === 'string' &&
              Object.hasOwn(statusLabels, event.details.status) ? (
                <p>
                  {
                    statusLabels[
                      event.details.status as keyof typeof statusLabels
                    ]
                  }
                </p>
              ) : null}
              {event.details.note ? <p>{event.details.note}</p> : null}
              {typeof event.details.role === 'string' &&
              Object.hasOwn(roleLabels, event.details.role) ? (
                <p>
                  {roleLabels[event.details.role as keyof typeof roleLabels]} ·{' '}
                  {event.details.is_active ? 'Aktif' : 'Tidak Aktif'}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {history.data?.length === 30 ? (
        <p>Menampilkan 30 aktivitas terbaru.</p>
      ) : null}
    </section>
  )
}

export function VerificationNote({ profile }: { profile: ResidentProfile }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-control bg-page p-4 text-sm leading-relaxed wrap-anywhere">
      <span
        className={cn(
          'inline-flex w-fit max-w-full items-center rounded-full px-3 py-1 text-xs leading-normal font-semibold wrap-anywhere whitespace-normal forced-colors:border forced-colors:border-[CanvasText]',
          profile.verification_status === 'terverifikasi'
            ? 'bg-success-soft text-success'
            : 'bg-warning-soft text-warning',
        )}
      >
        {statusLabels[profile.verification_status]}
      </span>
      {profile.review_note ? (
        <p>
          <strong>Catatan pengurus:</strong> {profile.review_note}
        </p>
      ) : null}
      {profile.reviewed_at ? (
        <p>Diperiksa pada {formatDate(profile.reviewed_at)}</p>
      ) : (
        <p>
          Data memerlukan pemeriksaan pengurus sebelum digunakan untuk layanan
          administrasi.
        </p>
      )}
    </div>
  )
}

export function ResidentDetails({
  profile,
  onClose,
  onPending,
}: {
  profile: ResidentProfile
  onClose: () => void
  onPending: (pending: boolean) => void
}) {
  const [reveal, setReveal] = useState(false)
  const [action, setAction] = useState<'repair' | 'archive' | 'restore' | null>(
    null,
  )
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const location = useLocation()
  const refresh = useRefreshResidents()
  const mutation = useMutation({
    mutationFn: async (kind: 'verify' | 'repair' | 'archive' | 'restore') => {
      if (kind === 'archive' || kind === 'restore')
        await archiveResident(profile, kind === 'archive')
      else
        await reviewResident(
          profile,
          kind === 'verify' ? 'terverifikasi' : 'perlu_perbaikan',
          kind === 'repair' ? note : '',
        )
    },
  })
  async function act(kind: 'verify' | 'repair' | 'archive' | 'restore') {
    if (mutation.isPending) return
    if (kind === 'repair' && !note.trim()) {
      setNoteError('Isi alasan perbaikan data.')
      return
    }
    onPending(true)
    try {
      await mutation.mutateAsync(kind)
      setAction(null)
      setNote('')
      await refresh()
    } catch {
      /* The mutation error is rendered below; the resident and note remain. */
    } finally {
      onPending(false)
    }
  }
  const details = [
    ['Nama Lengkap', profile.full_name],
    ['NIK', reveal ? profile.nik : maskIdentity(profile.nik)],
    [
      'Nomor Kartu Keluarga',
      profile.family_card_number
        ? reveal
          ? profile.family_card_number
          : maskIdentity(profile.family_card_number)
        : 'Belum diisi',
    ],
    [
      'Jenis Kelamin',
      profile.gender ? genderLabels[profile.gender] : 'Belum diisi',
    ],
    [
      'Status Pernikahan',
      profile.marital_status
        ? maritalLabels[profile.marital_status]
        : 'Belum diisi',
    ],
    ['Nomor HP', profile.phone],
    ['Alamat Lengkap', profile.address],
    ['RT', '04'],
    ['Email', profile.email],
    ['Role', roleLabels[profile.role]],
  ]
  return (
    <>
      <ModalBody>
        <div className="flex items-center gap-4 rounded-summary bg-page p-4 max-sm:flex-wrap max-sm:gap-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:wrap-anywhere max-sm:[&_h3]:text-lg [&_p]:mt-1 [&_p]:text-sm [&_p]:leading-normal [&_p]:text-muted [&>div]:min-w-0 [&>div]:flex-1">
          <span
            className="grid size-16 shrink-0 place-items-center rounded-full bg-brand text-2xl font-extrabold text-white max-sm:size-12 max-sm:text-lg"
            aria-hidden="true"
          >
            {initials(profile.full_name)}
          </span>
          <div>
            <h3>{profile.full_name}</h3>
            <p>RT 04</p>
          </div>
          <span
            className={cn(
              'inline-flex w-fit max-w-full items-center rounded-full px-3 py-1 text-xs leading-normal font-semibold wrap-anywhere whitespace-normal forced-colors:border forced-colors:border-[CanvasText]',
              profile.is_active
                ? 'bg-success-soft text-success'
                : 'bg-soft text-slate-600',
            )}
          >
            {profile.archived_at
              ? 'Diarsipkan'
              : profile.is_active
                ? 'Aktif'
                : 'Tidak Aktif'}
          </span>
        </div>
        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 max-sm:grid-cols-1 [&_dd]:m-0 [&_dd]:text-sm [&_dd]:leading-relaxed [&_dd]:font-bold [&_dd]:wrap-anywhere [&_dt]:mb-3 [&_dt]:text-sm [&_dt]:font-semibold [&_dt]:text-slate-600 [&>div]:min-w-0 [&>div]:rounded-summary [&>div]:border [&>div]:border-border [&>div]:p-3">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <Button
          type="button"
          aria-pressed={reveal}
          onClick={() => setReveal((value) => !value)}
          variant="ghost"
          size="text"
          align="start"
        >
          {reveal ? 'Samarkan NIK dan KK' : 'Tampilkan NIK dan KK'}
        </Button>
        <VerificationNote profile={profile} />
        {mutation.isError ? (
          <Feedback>{residentError(mutation.error)}</Feedback>
        ) : null}
        {profile.archived_at ? (
          <p className="flex items-start gap-3 rounded-control bg-blue-50 p-4 text-sm leading-relaxed text-info [&>svg]:mt-0.5 [&>svg]:shrink-0">
            Data diarsipkan pada {formatDate(profile.archived_at)}. Pulihkan
            arsip, lalu aktifkan akun melalui Edit Data bila diperlukan.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {!profile.archived_at ? (
            <>
              <Button
                type="button"
                disabled={
                  mutation.isPending ||
                  profile.verification_status === 'terverifikasi'
                }
                onClick={() => void act('verify')}
                variant="outline"
              >
                Verifikasi data
              </Button>
              <Button
                type="button"
                disabled={mutation.isPending}
                onClick={() => {
                  setAction('repair')
                  mutation.reset()
                }}
                variant="outline"
              >
                Minta perbaikan
              </Button>
              <Button
                type="button"
                disabled={mutation.isPending}
                onClick={() => {
                  setAction('archive')
                  mutation.reset()
                }}
                variant="danger"
              >
                Arsipkan warga
              </Button>
            </>
          ) : (
            <Button
              type="button"
              disabled={mutation.isPending}
              onClick={() => setAction('restore')}
              variant="outline"
            >
              Pulihkan arsip
            </Button>
          )}
        </div>
        {action ? (
          <section
            className="flex flex-col gap-3 rounded-control border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed [&_h3]:text-base [&_h3]:font-bold"
            aria-label="Konfirmasi tindakan"
          >
            <h3>
              {action === 'repair'
                ? `Minta perbaikan data ${profile.full_name}`
                : action === 'archive'
                  ? `Arsipkan ${profile.full_name}?`
                  : `Pulihkan ${profile.full_name}?`}
            </h3>
            {action === 'repair' ? (
              <div className="flex min-w-0 flex-col gap-1.5 [&>label]:text-sm [&>label]:leading-5 [&>label]:font-semibold [&>label]:text-slate-700">
                <label htmlFor="review-note">Alasan perbaikan *</label>
                <textarea
                  id="review-note"
                  className="min-h-25 w-full min-w-0 resize-y rounded-control border border-control-border bg-surface px-3 py-2.5 text-start font-sans text-base leading-6 text-ink placeholder:text-muted hover:border-slate-600 focus-visible:border-action focus-visible:outline-action disabled:cursor-not-allowed disabled:border-border disabled:bg-soft disabled:text-muted disabled:opacity-100 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger [&[readonly]]:bg-page"
                  value={note}
                  maxLength={2000}
                  aria-invalid={Boolean(noteError)}
                  aria-describedby={noteError ? 'review-note-error' : undefined}
                  onChange={(event) => {
                    setNote(event.target.value)
                    setNoteError('')
                  }}
                />
                {noteError ? (
                  <p
                    className="text-xs leading-[1.125rem] text-danger"
                    id="review-note-error"
                  >
                    {noteError}
                  </p>
                ) : null}
              </div>
            ) : (
              <p>
                {action === 'archive'
                  ? 'Akses akun akan dihentikan. Data dan riwayat tetap tersimpan.'
                  : 'Data kembali ke daftar dengan akun tetap tidak aktif.'}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={mutation.isPending}
                onClick={() => setAction(null)}
                variant="outline"
              >
                Batalkan tindakan
              </Button>
              <Button
                type="button"
                disabled={mutation.isPending}
                onClick={() => void act(action)}
                variant={action === 'archive' ? 'danger' : 'solid'}
              >
                {mutation.isPending ? 'Menyimpan…' : 'Konfirmasi tindakan'}
              </Button>
            </div>
          </section>
        ) : null}
        <ResidentHistory id={profile.id} />
      </ModalBody>
      <ModalFooter>
        <div>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Tutup
          </Button>
          {!profile.archived_at ? (
            <ButtonLink
              aria-disabled={mutation.isPending}
              variant="solid"
              to={{
                pathname: `/admin/warga/${profile.id}/edit`,
                search: location.search,
              }}
              onClick={(event) => {
                if (mutation.isPending) event.preventDefault()
              }}
            >
              Edit Data
            </ButtonLink>
          ) : null}
        </div>
      </ModalFooter>
    </>
  )
}
