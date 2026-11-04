import { buttons } from '../../components/ui'
import { ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useState } from 'react'
import { ResidentModal } from './ResidentModal'
import { ResidentEditor } from './ResidentEditor'
import { ResidentHistory, VerificationNote } from './ResidentDetails'
import { genderLabels, maritalLabels } from './data'

const roleLabels = {
  warga: 'Warga',
  ketua_rt: 'Ketua RT',
  pengurus_rt: 'Pengurus RT',
}
const statusLabels = {
  menunggu_verifikasi: 'Menunggu Verifikasi',
  terverifikasi: 'Terverifikasi',
  perlu_perbaikan: 'Perlu Perbaikan',
}

export function ResidentHome() {
  const { profile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  if (!profile) return null
  return (
    <main className="@container/page mx-auto w-full max-w-[1088px] flex-1 px-6 py-12 max-sm:px-4 max-sm:py-8">
      <div className="mb-8 [&>p:last-child]:mt-2 [&>p:last-child]:leading-6 [&>p:last-child]:text-muted">
        <p className="mb-2 text-xs font-bold tracking-[0.075rem] text-action">
          BERANDA WARGA
        </p>
        <h1>Selamat datang, {profile.full_name}!</h1>
        <p>Informasi akun dan profil warga Anda tersedia di sini.</p>
      </div>
      <section
        className="rounded-card border border-border bg-surface p-8 max-sm:p-6"
        aria-labelledby="profile-title"
      >
        <div className="flex flex-wrap items-center gap-4 border-b border-border pb-6 [&_h2]:text-xl [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-xs [&_p]:text-muted">
          <div className="grid size-12 place-items-center rounded-summary bg-green-50 text-green-700">
            <UserRound size={24} aria-hidden="true" />
          </div>
          <div>
            <h2 id="profile-title">Profil warga</h2>
            <p>Akun {roleLabels[profile.role]}</p>
          </div>
          <span className="ms-auto flex items-center gap-1.5 rounded-full bg-soft px-3 py-2 text-xs font-semibold text-slate-600 max-sm:ms-0">
            <ShieldCheck size={16} aria-hidden="true" />
            {statusLabels[profile.verification_status]}
          </span>
        </div>
        <dl className="my-6 grid grid-cols-2 gap-6 max-sm:grid-cols-1 [&_dd]:m-0 [&_dd]:text-sm [&_dd]:leading-6 [&_dd]:font-semibold [&_dd]:wrap-anywhere [&_dt]:mb-1.5 [&_dt]:text-xs [&_dt]:text-muted">
          {[
            ['Nama lengkap', profile.full_name],
            ['Email', profile.email],
            ['NIK', profile.nik],
            ['Nomor HP', profile.phone],
            ['Alamat', profile.address],
            ['Blok rumah', profile.house_block],
            ['Nomor KK', profile.family_card_number ?? 'Belum diisi'],
            [
              'Jenis kelamin',
              profile.gender ? genderLabels[profile.gender] : 'Belum diisi',
            ],
            [
              'Status pernikahan',
              profile.marital_status
                ? maritalLabels[profile.marital_status]
                : 'Belum diisi',
            ],
            ['Nomor rumah', profile.house_number ?? 'Belum diisi'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <VerificationNote profile={profile} />
        <div className="my-5">
          <button
            type="button"
            className={buttons.secondary}
            onClick={() => setEditing(true)}
          >
            Edit profil sendiri
          </button>
        </div>
        <ResidentHistory id={profile.id} />
      </section>
      {editing ? (
        <ResidentModal
          title="Edit Profil Saya"
          description="Perubahan identitas akan diperiksa ulang oleh pengurus RT."
          onClose={() => setEditing(false)}
          pending={pending}
        >
          <ResidentEditor
            profile={profile}
            onPending={setPending}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        </ResidentModal>
      ) : null}
    </main>
  )
}
