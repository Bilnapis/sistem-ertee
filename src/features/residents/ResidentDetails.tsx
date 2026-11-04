import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router'
import { Feedback } from '../../components/Feedback'
import type { ResidentProfile } from '../../lib/database.types'
import { archiveResident, formatDate, genderLabels, initials, maritalLabels, maskIdentity, residentError, reviewResident, roleLabels, statusLabels, useRefreshResidents, useResidentHistory } from './data'
import styles from './Residents.module.css'

const eventLabels: Record<string, string> = { created: 'Data warga ditambahkan', profile_updated: 'Identitas diperbarui', access_updated: 'Role atau status akun diubah', archived: 'Data diarsipkan', restored: 'Arsip dipulihkan', reviewed: 'Status verifikasi diperbarui' }
export function ResidentHistory({ id }: { id: string }) {
  const history = useResidentHistory(id)
  return <section className={styles.history} aria-label="Riwayat perubahan"><h3>Riwayat perubahan</h3>
    {history.isPending ? <p role="status">Memuat riwayat…</p> : history.isError ? <><Feedback>Riwayat belum dapat dimuat.</Feedback><button type="button" className={styles.textButton} onClick={() => void history.refetch()}>Coba lagi riwayat</button></> : !history.data?.length ? <p>Belum ada riwayat perubahan.</p> : <ol>{history.data.map(event => <li key={event.id}><strong>{eventLabels[event.action] ?? 'Data diperbarui'}</strong><p>{event.actor_name ?? 'Administrator'} · {formatDate(event.occurred_at)}</p>{typeof event.details.status === 'string' && Object.hasOwn(statusLabels, event.details.status) ? <p>{statusLabels[event.details.status as keyof typeof statusLabels]}</p> : null}{event.details.note ? <p>{event.details.note}</p> : null}{typeof event.details.role === 'string' && Object.hasOwn(roleLabels, event.details.role) ? <p>{roleLabels[event.details.role as keyof typeof roleLabels]} · {event.details.is_active ? 'Aktif' : 'Tidak Aktif'}</p> : null}</li>)}</ol>}
    {history.data?.length === 30 ? <p>Menampilkan 30 aktivitas terbaru.</p> : null}
  </section>
}

export function VerificationNote({ profile }: { profile: ResidentProfile }) {
  return <div className={styles.verificationNote}><span className={`${styles.badge} ${profile.verification_status === 'terverifikasi' ? styles.activeBadge : styles.pendingBadge}`}>{statusLabels[profile.verification_status]}</span>
    {profile.review_note ? <p><strong>Catatan pengurus:</strong> {profile.review_note}</p> : null}
    {profile.reviewed_at ? <p>Diperiksa pada {formatDate(profile.reviewed_at)}</p> : <p>Data memerlukan pemeriksaan pengurus sebelum digunakan untuk layanan administrasi.</p>}
  </div>
}

export function ResidentDetails({ profile, onClose, onPending }: { profile: ResidentProfile; onClose: () => void; onPending: (pending: boolean) => void }) {
  const [reveal, setReveal] = useState(false)
  const [action, setAction] = useState<'repair' | 'archive' | 'restore' | null>(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const location = useLocation()
  const refresh = useRefreshResidents()
  const mutation = useMutation({ mutationFn: async (kind: 'verify' | 'repair' | 'archive' | 'restore') => {
    if (kind === 'archive' || kind === 'restore') await archiveResident(profile, kind === 'archive')
    else await reviewResident(profile, kind === 'verify' ? 'terverifikasi' : 'perlu_perbaikan', kind === 'repair' ? note : '')
  } })
  async function act(kind: 'verify' | 'repair' | 'archive' | 'restore') {
    if (mutation.isPending) return
    if (kind === 'repair' && !note.trim()) { setNoteError('Isi alasan perbaikan data.'); return }
    onPending(true)
    try { await mutation.mutateAsync(kind); setAction(null); setNote(''); await refresh() }
    catch { /* The mutation error is rendered below; the resident and note remain. */ }
    finally { onPending(false) }
  }
  const details = [
    ['Nama Lengkap', profile.full_name], ['NIK', reveal ? profile.nik : maskIdentity(profile.nik)],
    ['Nomor Kartu Keluarga', profile.family_card_number ? reveal ? profile.family_card_number : maskIdentity(profile.family_card_number) : 'Belum diisi'],
    ['Jenis Kelamin', profile.gender ? genderLabels[profile.gender] : 'Belum diisi'],
    ['Status Pernikahan', profile.marital_status ? maritalLabels[profile.marital_status] : 'Belum diisi'],
    ['Blok Rumah', profile.house_block], ['Nomor Rumah', profile.house_number ?? 'Belum diisi'], ['Nomor HP', profile.phone],
    ['Alamat Lengkap', profile.address], ['RT', '04'], ['Email', profile.email], ['Role', roleLabels[profile.role]],
  ]
  return <div className={styles.details}>
    <div className={styles.profileSummary}><span className={styles.avatar} aria-hidden="true">{initials(profile.full_name)}</span><div><h3>{profile.full_name}</h3><p>Blok {profile.house_block} · RT 04</p></div><span className={`${styles.badge} ${profile.is_active ? styles.activeBadge : styles.mutedBadge}`}>{profile.archived_at ? 'Diarsipkan' : profile.is_active ? 'Aktif' : 'Tidak Aktif'}</span></div>
    <dl className={styles.detailGrid}>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <button type="button" className={styles.textButton} aria-pressed={reveal} onClick={() => setReveal(value => !value)}>{reveal ? 'Samarkan NIK dan KK' : 'Tampilkan NIK dan KK'}</button>
    <VerificationNote profile={profile} />
    {mutation.isError ? <Feedback>{residentError(mutation.error)}</Feedback> : null}
    {profile.archived_at ? <p className={styles.notice}>Data diarsipkan pada {formatDate(profile.archived_at)}. Pulihkan arsip, lalu aktifkan akun melalui Edit Data bila diperlukan.</p> : null}
    <div className={styles.managementActions}>
      {!profile.archived_at ? <><button type="button" className={styles.secondary} disabled={mutation.isPending || profile.verification_status === 'terverifikasi'} onClick={() => void act('verify')}>Verifikasi data</button><button type="button" className={styles.secondary} disabled={mutation.isPending} onClick={() => { setAction('repair'); mutation.reset() }}>Minta perbaikan</button><button type="button" className={styles.danger} disabled={mutation.isPending} onClick={() => { setAction('archive'); mutation.reset() }}>Arsipkan warga</button></>
        : <button type="button" className={styles.secondary} disabled={mutation.isPending} onClick={() => setAction('restore')}>Pulihkan arsip</button>}
    </div>
    {action ? <section className={styles.confirmation} aria-label="Konfirmasi tindakan">
      <h3>{action === 'repair' ? `Minta perbaikan data ${profile.full_name}` : action === 'archive' ? `Arsipkan ${profile.full_name}?` : `Pulihkan ${profile.full_name}?`}</h3>
      {action === 'repair' ? <div className="field"><label htmlFor="review-note">Alasan perbaikan *</label><textarea id="review-note" className={styles.textarea} value={note} maxLength={2000} aria-invalid={Boolean(noteError)} aria-describedby={noteError ? 'review-note-error' : undefined} onChange={event => { setNote(event.target.value); setNoteError('') }} />{noteError ? <p className="field-error" id="review-note-error">{noteError}</p> : null}</div>
        : <p>{action === 'archive' ? 'Akses akun akan dihentikan. Data dan riwayat tetap tersimpan.' : 'Data kembali ke daftar dengan akun tetap tidak aktif.'}</p>}
      <div className={styles.inlineActions}><button type="button" className={styles.secondary} disabled={mutation.isPending} onClick={() => setAction(null)}>Batalkan tindakan</button><button type="button" className={action === 'archive' ? styles.danger : styles.primary} disabled={mutation.isPending} onClick={() => void act(action)}>{mutation.isPending ? 'Menyimpan…' : 'Konfirmasi tindakan'}</button></div>
    </section> : null}
    <ResidentHistory id={profile.id} />
    <footer className={styles.dialogActions}><span /><div><button type="button" className={styles.secondary} disabled={mutation.isPending} onClick={onClose}>Tutup</button>{!profile.archived_at ? <Link aria-disabled={mutation.isPending} className={styles.primary} to={{ pathname: `/admin/warga/${profile.id}/edit`, search: location.search }} onClick={event => { if (mutation.isPending) event.preventDefault() }}>Edit Data</Link> : null}</div></footer>
  </div>
}
