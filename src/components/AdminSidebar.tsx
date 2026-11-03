import { ClipboardList, FileText, LayoutDashboard, UsersRound, Wallet } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import styles from './AdminSidebar.module.css'

export type AdminSidebarAccount = {
  name: string
  role: string
  initials?: string
}

export type AdminSidebarProps = {
  account: AdminSidebarAccount
  communityLabel: string
  basePath?: string
  className?: string
  paths?: Partial<Record<'dashboard' | 'warga' | 'surat' | 'iuran' | 'pengaduan', string>>
  onNavigate?: () => void
}

const navigation = [
  { id: 'dashboard', label: 'Dashboard', path: '', icon: LayoutDashboard },
  { id: 'warga', label: 'Warga', path: '/warga', icon: UsersRound },
  { id: 'surat', label: 'Pengajuan Surat', path: '/pengajuan-surat', icon: FileText },
  { id: 'iuran', label: 'Iuran Warga', path: '/iuran-warga', icon: Wallet },
  { id: 'pengaduan', label: 'Pengaduan', path: '/pengaduan', icon: ClipboardList },
] as const

function getInitials(name: string) {
  const words = name.trim().split(/\s+/)
  const initials = words.length > 1
    ? `${Array.from(words[0])[0] ?? ''}${Array.from(words[words.length - 1])[0] ?? ''}`
    : Array.from(words[0]).slice(0, 2).join('')
  return initials.toLocaleUpperCase('id-ID')
}

/** Place inside a React Router. Account and community information come from the parent. */
export function AdminSidebar({ account, communityLabel, basePath = '/admin', className, paths, onNavigate }: AdminSidebarProps) {
  const rootPath = basePath.replace(/\/+$/, '') || '/'
  const destination = (path: string) => path ? `${rootPath === '/' ? '' : rootPath}${path}` : rootPath
  const initials = account.initials ?? getInitials(account.name)

  return <aside className={[styles.sidebar, className].filter(Boolean).join(' ')} aria-label="Sidebar admin">
    <header className={styles.brand}>
      <Link className={styles.brandName} to={paths?.dashboard ?? rootPath} onClick={onNavigate} aria-label="ErTee — dashboard admin">ErTee</Link>
      <p className={styles.community}>{communityLabel}</p>
    </header>

    <nav className={styles.navigation} aria-label="Navigasi admin">
      <ul className={styles.menu}>
        {navigation.map(({ id, label, path, icon: Icon }) => <li key={id}>
          <NavLink to={paths?.[id] ?? destination(path)} end={id === 'dashboard'} onClick={onNavigate}
            className={({ isActive }) => `${styles.menuLink}${isActive ? ` ${styles.active}` : ''}`}>
            <Icon size={20} strokeWidth={2} className={styles.menuIcon} aria-hidden="true" focusable="false" />
            <span className={styles.menuLabel}>{label}</span>
          </NavLink>
        </li>)}
      </ul>
    </nav>

    <footer className={styles.footer}>
      <div className={styles.account}>
        <span className={styles.avatar} aria-hidden="true">{initials}</span>
        <div className={styles.accountDetails}>
          <p className={styles.accountName} title={account.name}>{account.name}</p>
          <p className={styles.accountRole} title={account.role}>{account.role}</p>
        </div>
      </div>
    </footer>
  </aside>
}
