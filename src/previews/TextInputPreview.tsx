import { useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Hash, LockKeyhole, Mail, TextCursorInput, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { TextInput } from '../components/TextInput'
import styles from './TextInputPreview.module.css'

export default function TextInputPreview() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const emailInput = useRef<HTMLInputElement>(null)

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(false)
    if (!emailInput.current?.validity.valid) {
      setError('Masukkan alamat email yang valid, misalnya nama@contoh.id.')
      emailInput.current?.focus()
      return
    }
    setError('')
    setSaved(true)
  }

  return <div className={styles.page}>
    <header className={styles.header}>
      <Link className={styles.brand} to="/login" aria-label="ErTee, ke halaman masuk">
        <span className={styles.brandIcon} aria-hidden="true"><TextCursorInput size={22} /></span>
        ErTee<span className={styles.brandDetail}>Komponen</span>
      </Link>
      <Link className={styles.backLink} to="/login"><ArrowLeft size={16} aria-hidden="true" />Halaman masuk</Link>
    </header>
    <main className={styles.main}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>FORMULIR / 01</p>
        <h1>Text input<span className={styles.titleDot}>.</span></h1>
        <p>Ruang untuk setiap jawaban. Label yang jelas, detail yang rapi, dan respons di setiap interaksi.</p>
      </div>

      <section className={styles.sheet} aria-labelledby="states-title">
        <div className={styles.sectionHeading}>
          <div><h2 id="states-title">Satu komponen, empat state</h2><p>Klik atau gunakan Tab untuk mencoba perpindahan fokus.</p></div>
          <span className={styles.badge}><span aria-hidden="true" />Interaktif</span>
        </div>
        <div className={styles.states}>
          <article className={styles.example}>
            <div className={styles.exampleHeading}><span className={styles.number}>01</span><h3>Idle</h3><span className={styles.stateNote}>Siap diisi</span></div>
            <TextInput label="Nama lengkap" placeholder="Masukkan nama lengkap" helperText="Gunakan nama sesuai identitas Anda." leadingIcon={<UserRound />} autoComplete="off" />
          </article>
          <article className={styles.example}>
            <div className={styles.exampleHeading}><span className={styles.number}>02</span><h3>Active</h3><span className={styles.stateNote}>Sedang difokuskan</span></div>
            <TextInput label="Alamat email" type="email" defaultValue="warga@contoh.id" helperText="Fokus mengikuti input yang Anda pilih." leadingIcon={<Mail />} autoFocus autoComplete="off" />
          </article>
          <article className={styles.example}>
            <div className={styles.exampleHeading}><span className={styles.number}>03</span><h3>Error</h3><span className={styles.stateNote}>Perlu diperbaiki</span></div>
            <TextInput label="Nomor HP" type="tel" defaultValue="0812" error="Nomor HP belum lengkap. Masukkan 10–15 digit angka." leadingIcon={<Hash />} autoComplete="off" />
          </article>
          <article className={styles.example}>
            <div className={styles.exampleHeading}><span className={styles.number}>04</span><h3>Disabled</h3><span className={styles.stateNote}>Tidak dapat diubah</span></div>
            <TextInput label="Wilayah tempat tinggal" defaultValue="RT 04 / RW 08" helperText="Wilayah ditentukan oleh pengurus RT." leadingIcon={<LockKeyhole />} disabled />
          </article>
        </div>
      </section>

      <section className={styles.playground} aria-labelledby="try-title">
        <div className={styles.playgroundIntro}>
          <span className={styles.smallIcon} aria-hidden="true"><TextCursorInput size={22} /></span>
          <h2 id="try-title">Coba langsung.</h2>
          <p>Isi email, tampilkan password, lalu periksa respons formulirnya.</p>
          <p className={styles.localNote}>Contoh interaksi. Data tidak dikirim atau disimpan.</p>
        </div>
        <form className={styles.form} noValidate onSubmit={submit}>
          <TextInput ref={emailInput} label="Email untuk dicoba" type="email" required value={email}
            onChange={event => { setEmail(event.target.value); setError(''); setSaved(false) }}
            placeholder="nama@contoh.id" helperText="Gunakan format nama@domain.id." error={error}
            leadingIcon={<Mail />} aria-describedby="demo-email-note" autoComplete="off" />
          <span className={styles.srOnly} id="demo-email-note">Hanya untuk pratinjau komponen.</span>
          <TextInput label="Password untuk dicoba" type="password" placeholder="Masukkan password contoh"
            value={password} onChange={event => { setPassword(event.target.value); setSaved(false) }}
            helperText="Gunakan tombol mata untuk menampilkan atau menyembunyikan teks."
            leadingIcon={<LockKeyhole />} visible={visible} onToggleVisibility={() => setVisible(previous => !previous)} autoComplete="off" />
          <div className={styles.formActions}>
            <button className={styles.submit} type="submit">Periksa input<ArrowRight size={18} aria-hidden="true" /></button>
            <p className={styles.success} role="status">{saved ? <><Check size={18} aria-hidden="true" />Format email sudah benar.</> : null}</p>
          </div>
        </form>
      </section>
      <footer className={styles.footer}><span>ErTee · Layanan Digital Warga</span><span>Text input / v1.0</span></footer>
    </main>
  </div>
}
