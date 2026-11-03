import { Link, useLocation } from 'react-router'
import { AdminSidebar } from '../components/AdminSidebar'
import styles from './AdminSidebarPreview.module.css'

const basePath = '/preview/admin-sidebar'
// Display-only values from design.fig; no authenticated account is represented here.
const designAccount = { name: 'Admin RW 04', role: 'Pengelola lingkungan', initials: 'AR' }
const pageLabels: Record<string, string> = {
  '': 'Dashboard', warga: 'Warga', 'pengajuan-surat': 'Pengajuan Surat', 'iuran-warga': 'Iuran Warga', pengaduan: 'Pengaduan',
}

export default function AdminSidebarPreview() {
  const { pathname } = useLocation()
  const section = pathname.slice(basePath.length).split('/').filter(Boolean)[0] ?? ''

  return <div className={styles.preview}>
    <AdminSidebar account={designAccount} communityLabel="ADMIN RT 04 / RW 08" basePath={basePath} />
    <main className={styles.content}>
      <p className={styles.caption}>Pratinjau komponen</p>
      <h1>{pageLabels[section] ?? 'Sidebar admin'}</h1>
      <p>Sidebar admin ErTee sesuai desain. Pilih menu untuk melihat penanda navigasi aktif.</p>
      <p>Data akun merupakan contoh dari desain.</p>
      <Link to="/login" className="text-link">Kembali ke halaman masuk</Link>
    </main>
  </div>
}
