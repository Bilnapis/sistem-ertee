import { useState } from 'react'
import { LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { authErrorMessage } from '../auth/errors'
import { getSupabase } from '../../lib/supabase'
import { Feedback } from '../../components/Feedback'

export function SignOutButton() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function signOut() {
    setPending(true); setError('')
    try { const { error } = await getSupabase().auth.signOut({ scope: 'local' }); if (error) throw error }
    catch (error) { setError(authErrorMessage(error)) }
    finally { setPending(false) }
  }
  return <div className="signout-area"><button className="secondary-button" type="button" disabled={pending} onClick={signOut}><LogOut size={18} aria-hidden="true" />{pending ? 'Sedang keluar…' : 'Keluar'}</button>{error ? <Feedback>{error}</Feedback> : null}</div>
}

const roleLabels = { warga: 'Warga', ketua_rt: 'Ketua RT', pengurus_rt: 'Pengurus RT' }
const statusLabels = { menunggu_verifikasi: 'Menunggu Verifikasi', terverifikasi: 'Terverifikasi', perlu_perbaikan: 'Perlu Perbaikan' }

export function ResidentHome() {
  const { profile } = useAuth()
  if (!profile) return null
  return <div className="resident-page">
    <header className="resident-header"><a className="brand" href="/warga">ErTee<span>Layanan Digital Warga</span></a><SignOutButton /></header>
    <main className="resident-main">
      <div className="resident-welcome"><p className="eyebrow">BERANDA WARGA</p><h1>Selamat datang, {profile.full_name}!</h1><p>Informasi akun dan profil warga Anda tersedia di sini.</p></div>
      <section className="profile-card" aria-labelledby="profile-title">
        <div className="profile-heading"><div className="profile-icon"><UserRound size={24} aria-hidden="true" /></div><div><h2 id="profile-title">Profil warga</h2><p>Akun {roleLabels[profile.role]}</p></div><span className="status-badge"><ShieldCheck size={16} aria-hidden="true" />{statusLabels[profile.verification_status]}</span></div>
        <dl className="profile-details">{[
          ['Nama lengkap', profile.full_name], ['Email', profile.email], ['NIK', profile.nik], ['Nomor HP', profile.phone], ['Alamat', profile.address], ['Blok rumah', profile.house_block],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <p className="profile-note">{profile.verification_status === 'terverifikasi' ? 'Data warga Anda telah diverifikasi.' : 'Data warga memerlukan pemeriksaan pengurus RT sebelum digunakan untuk layanan administrasi.'}</p>
      </section>
    </main><footer className="resident-footer">© ErTee • Layanan Digital Warga</footer>
  </div>
}
