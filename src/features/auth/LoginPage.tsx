import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { X } from 'lucide-react'
import { FormField } from '../../components/FormField'
import { Feedback } from '../../components/Feedback'
import { getSupabase, isSupabaseConfigured, setSessionPersistence } from '../../lib/supabase'
import { authErrorMessage } from './errors'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [remember, setRemember] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const helpDialog = useRef<HTMLDialogElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setError(''); setPending(true)
    try {
      setSessionPersistence(remember)
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (error) throw error
    } catch (error) { setError(authErrorMessage(error)) }
    finally { setPending(false) }
  }

  return <main className="auth-page login-page">
    <section className="auth-card login-card" aria-labelledby="login-title">
      <header className="auth-header"><h1 id="login-title">Selamat Datang!</h1><p>Masuk untuk mengakses layanan warga ErTee.</p></header>
      <form onSubmit={submit} aria-busy={pending}>
        <div className="login-fields">
          <FormField id="email" label="Email" type="email" placeholder="Masukkan alamat email" autoComplete="username" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />
          <FormField id="password" label="Password" type="password" placeholder="Masukkan password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} visible={visible} hiddenIcon="eye" onToggleVisibility={() => setVisible(value => !value)} />
        </div>
        <div className="login-actions">
          <div className="form-options"><label className="checkbox-label"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />Ingat saya</label><button className="text-link" type="button" onClick={() => helpDialog.current?.showModal()}>Lupa password?</button></div>
          {error ? <Feedback>{error}</Feedback> : null}
          <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Sedang masuk…' : 'Masuk'}</button>
        </div>
      </form>
      <div className="account-support"><p className="account-link">Belum punya akun? <Link to="/register">Daftar di sini</Link></p><p className="help-text">Butuh bantuan? Hubungi Admin RT/RW</p></div>
    </section>
    <footer className="auth-copyright">© ErTee • Layanan Digital Warga</footer>
    {!isSupabaseConfigured ? <p className="setup-note" role="status">Mode persiapan · Koneksi Supabase belum dikonfigurasi.</p> : null}
    <dialog ref={helpDialog} className="help-dialog" aria-labelledby="help-title">
      <button className="close-dialog" type="button" aria-label="Tutup bantuan" onClick={() => helpDialog.current?.close()}><X size={22} /></button>
      <h2 id="help-title">Bantuan akun</h2><p>Hubungi pengurus RT untuk bantuan pemulihan password. Pemulihan mandiri melalui email belum tersedia pada tahap ini.</p><button type="button" className="primary-button" onClick={() => helpDialog.current?.close()}>Mengerti</button>
    </dialog>
  </main>
}
