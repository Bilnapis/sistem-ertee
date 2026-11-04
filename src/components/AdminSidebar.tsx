import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { Link, NavLink } from 'react-router'
import styles from './AdminSidebar.module.css'

export type AdminSidebarProps = {
  communityLabel: string
  basePath?: string
  className?: string
  paths?: Partial<
    Record<'dashboard' | 'warga' | 'surat' | 'iuran' | 'pengaduan', string>
  >
  onNavigate?: () => void
}

const navigation = [
  { id: 'dashboard', label: 'Dashboard', path: '', icon: LayoutDashboard },
  { id: 'warga', label: 'Warga', path: '/warga', icon: UsersRound },
  {
    id: 'surat',
    label: 'Pengajuan Surat',
    path: '/pengajuan-surat',
    icon: FileText,
  },
  { id: 'iuran', label: 'Iuran Warga', path: '/iuran-warga', icon: Wallet },
  {
    id: 'pengaduan',
    label: 'Pengaduan',
    path: '/pengaduan',
    icon: ClipboardList,
  },
] as const

/** Place inside a React Router. Community information and destinations come from the parent. */
export function AdminSidebar({
  communityLabel,
  basePath = '/admin',
  className,
  paths,
  onNavigate,
}: AdminSidebarProps) {
  const rootPath = basePath.replace(/\/+$/, '') || '/'
  const destination = (path: string) =>
    path ? `${rootPath === '/' ? '' : rootPath}${path}` : rootPath

  return (
    <aside
      className={[styles.sidebar, className].filter(Boolean).join(' ')}
      aria-label="Sidebar admin"
    >
      <header className={styles.brand}>
        <Link
          className={styles.brandName}
          to={paths?.dashboard ?? rootPath}
          onClick={onNavigate}
          aria-label="ErTee — dashboard admin"
        >
          ErTee
        </Link>
        <p className={styles.community}>{communityLabel}</p>
      </header>

      <nav className={styles.navigation} aria-label="Navigasi admin">
        <ul className={styles.menu}>
          {navigation.map(({ id, label, path, icon: Icon }) => (
            <li key={id}>
              <NavLink
                to={paths?.[id] ?? destination(path)}
                end={id === 'dashboard'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `${styles.menuLink}${isActive ? ` ${styles.active}` : ''}`
                }
              >
                <Icon
                  size={20}
                  strokeWidth={2}
                  className={styles.menuIcon}
                  aria-hidden="true"
                  focusable="false"
                />
                <span className={styles.menuLabel}>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <footer className={styles.productMark} aria-hidden="true">
        <span className={styles.productName}>ErTee</span>
        <span className={styles.productDescription}>Layanan Digital Warga</span>
      </footer>
    </aside>
  )
}
