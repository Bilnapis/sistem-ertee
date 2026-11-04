import { useRef } from 'react'
import { Menu, X } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { useAuth } from '../features/auth/AuthProvider'
import { SignOutButton } from '../features/auth/SignOutButton'
import { AdminSidebar } from './AdminSidebar'
import { AccountMenu } from './AccountMenu'
import styles from './AuthenticatedLayout.module.css'
import { isManager } from '../features/residents/data'

export function AuthenticatedLayout() {
  const { profile } = useAuth()
  const drawer = useRef<HTMLDialogElement>(null)
  if (!profile) return null
  const sidebarProps = {
    communityLabel: `${profile.role === 'warga' ? 'WARGA' : 'ADMIN'} RT 04`,
    basePath: '/warga',
    paths: {
      warga: isManager(profile.role) ? '/admin/warga' : '/warga/profil',
      surat: isManager(profile.role)
        ? '/admin/pengajuan-surat'
        : '/warga/pengajuan-surat',
    },
  }

  return (
    <div className={styles.layout}>
      <div className={styles.desktopSidebar}>
        <AdminSidebar {...sidebarProps} />
      </div>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <div className={styles.headerBrand}>
              <button
                type="button"
                className={styles.menuButton}
                aria-label="Buka menu navigasi"
                aria-haspopup="dialog"
                onClick={() => drawer.current?.showModal()}
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              <Link className={styles.brand} to="/warga">
                <span className={styles.brandName}>ErTee</span>
                <span className={styles.brandDescription}>
                  Layanan Digital Warga
                </span>
              </Link>
            </div>
            <div className={styles.headerActions}>
              <AccountMenu profile={profile} />
            </div>
          </div>
        </header>

        <Outlet />
        <footer className={`resident-footer ${styles.footer}`}>
          <span>© ErTee • Layanan Digital Warga</span>
          <SignOutButton />
        </footer>
      </div>
      <dialog
        ref={drawer}
        className={styles.drawer}
        aria-label="Menu navigasi"
        closedby="any"
      >
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Tutup menu navigasi"
          onClick={() => drawer.current?.close()}
        >
          <X size={24} aria-hidden="true" />
        </button>
        <AdminSidebar
          {...sidebarProps}
          className={styles.drawerSidebar}
          onNavigate={() => drawer.current?.close()}
        />
      </dialog>
    </div>
  )
}
