import { useRef } from 'react'
import { Menu, X } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { useAuth } from '../features/auth/AuthProvider'
import { SignOutButton } from '../features/auth/SignOutButton'
import { AdminSidebar } from './AdminSidebar'
import styles from './AuthenticatedLayout.module.css'

const roleLabels = { warga: 'Warga', ketua_rt: 'Ketua RT', pengurus_rt: 'Pengurus RT' }
const sidebarPaths = { warga: '/warga/profil' }

export function AuthenticatedLayout() {
  const { profile } = useAuth()
  const drawer = useRef<HTMLDialogElement>(null)
  if (!profile) return null
  const sidebarProps = {
    account: { name: profile.full_name, role: roleLabels[profile.role] },
    communityLabel: `${profile.role === 'warga' ? 'WARGA' : 'ADMIN'} RT 04 / RW 08`,
    basePath: '/warga',
    paths: sidebarPaths,
  }

  return <div className={styles.layout}>
    <div className={styles.desktopSidebar}><AdminSidebar {...sidebarProps} /></div>
    <div className={styles.content}>
      <header className={`resident-header ${styles.header}`}>
        <div className={styles.headerBrand}>
          <button type="button" className={styles.menuButton} aria-label="Buka menu navigasi" aria-haspopup="dialog" onClick={() => drawer.current?.showModal()}><Menu size={24} aria-hidden="true" /></button>
          <Link className="brand" to="/warga">ErTee<span>Layanan Digital Warga</span></Link>
        </div>
        <SignOutButton />
      </header>
      <Outlet />
      <footer className="resident-footer">© ErTee • Layanan Digital Warga</footer>
    </div>
    <dialog ref={drawer} className={styles.drawer} aria-label="Menu navigasi" closedby="any">
      <button type="button" className={styles.closeButton} aria-label="Tutup menu navigasi" onClick={() => drawer.current?.close()}><X size={24} aria-hidden="true" /></button>
      <AdminSidebar {...sidebarProps} className={styles.drawerSidebar} onNavigate={() => drawer.current?.close()} />
    </dialog>
  </div>
}
