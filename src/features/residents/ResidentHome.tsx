import { ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useState } from 'react'
import { ResidentModal } from './ResidentModal'
import { ResidentEditor } from './ResidentEditor'
import { ResidentHistory, VerificationNote } from './ResidentDetails'
import { genderLabels, maritalLabels } from './data'

const roleLabels = { warga: 'Warga', ketua_rt: 'Ketua RT', pengurus_rt: 'Pengurus RT' }
const statusLabels = { menunggu_verifikasi: 'Menunggu Verifikasi', terverifikasi: 'Terverifikasi', perlu_perbaikan: 'Perlu Perbaikan' }

export function ResidentHome() {
  const { profile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  if (!profile) return null
  return <main className="resident-main">
      <div className="resident-welcome"><p className="eyebrow">BERANDA WARGA</p><h1>Selamat datang, {profile.full_name}!</h1><p>Informasi akun dan profil warga Anda tersedia di sini.</p></div>
      <section className="profile-card" aria-labelledby="profile-title">
        <div className="profile-heading"><div className="profile-icon"><UserRound size={24} aria-hidden="true" /></div><div><h2 id="profile-title">Profil warga</h2><p>Akun {roleLabels[profile.role]}</p></div><span className="status-badge"><ShieldCheck size={16} aria-hidden="true" />{statusLabels[profile.verification_status]}</span></div>
        <dl className="profile-details">{[
          ['Nama lengkap', profile.full_name], ['Email', profile.email], ['NIK', profile.nik], ['Nomor HP', profile.phone], ['Alamat', profile.address], ['Blok rumah', profile.house_block],
          ['Nomor KK', profile.family_card_number ?? 'Belum diisi'], ['Jenis kelamin', profile.gender ? genderLabels[profile.gender] : 'Belum diisi'],
          ['Status pernikahan', profile.marital_status ? maritalLabels[profile.marital_status] : 'Belum diisi'], ['Nomor rumah', profile.house_number ?? 'Belum diisi'],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <VerificationNote profile={profile} />
        <div className="profile-edit-action"><button type="button" className="secondary-button" onClick={() => setEditing(true)}>Edit profil sendiri</button></div>
        <ResidentHistory id={profile.id} />
      </section>
      {editing ? <ResidentModal title="Edit Profil Saya" description="Perubahan identitas akan diperiksa ulang oleh pengurus RT." onClose={() => setEditing(false)} pending={pending}><ResidentEditor profile={profile} onPending={setPending} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} /></ResidentModal> : null}
    </main>
}
