import { useRef } from 'react'
import {  X } from 'lucide-react'
import {  Outlet } from 'react-router'
import { useAuth } from '../features/auth/AuthProvider'
import { AdminSidebar } from './AdminSidebar'
import styles from './AuthenticatedLayout.module.css'
import { isManager } from '../features/residents/data'

const roleLabels = { warga: 'Warga', ketua_rt: 'Ketua RT', pengurus_rt: 'Pengurus RT' }

export function AuthenticatedLayout() {
  const { profile } = useAuth()
  const drawer = useRef<HTMLDialogElement>(null)
  if (!profile) return null
  const sidebarProps = {
    account: { name: profile.full_name, role: roleLabels[profile.role] },
    communityLabel: `${profile.role === 'warga' ? 'WARGA' : 'ADMIN'} RT 04 / RW 08`,
    basePath: '/warga',
    paths: { warga: isManager(profile.role) ? '/admin/warga' : '/warga/profil' },
  }

  return <div className={styles.layout}>
    <div className={styles.desktopSidebar}><AdminSidebar {...sidebarProps} /></div>
    <div className={styles.content}>
      <Outlet />
      <footer className="resident-footer">© ErTee • Layanan Digital Warga</footer>
    </div>
    <dialog ref={drawer} className={styles.drawer} aria-label="Menu navigasi" closedby="any">
      <button type="button" className={styles.closeButton} aria-label="Tutup menu navigasi" onClick={() => drawer.current?.close()}><X size={24} aria-hidden="true" /></button>
      <AdminSidebar {...sidebarProps} className={styles.drawerSidebar} onNavigate={() => drawer.current?.close()} />
    </dialog>
  </div>
}
