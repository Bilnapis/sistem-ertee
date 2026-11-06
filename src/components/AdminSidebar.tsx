import { cn } from '../lib/cn'
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  Megaphone,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { Logo } from './Logo'

export type AdminSidebarProps = {
  communityLabel: string
  basePath?: string
  collapsed?: boolean
  className?: string
  paths?: Partial<
    Record<
      'dashboard' | 'warga' | 'surat' | 'iuran' | 'pengaduan' | 'pengumuman',
      string
    >
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
  {
    id: 'pengumuman',
    label: 'Pengumuman',
    path: '/pengumuman',
    icon: Megaphone,
  },
] as const

/** Place inside a React Router. Community information and destinations come from the parent. */
export function AdminSidebar({
  communityLabel,
  basePath = '/admin',
  collapsed = false,
  className,
  paths,
  onNavigate,
}: AdminSidebarProps) {
  const rootPath = basePath.replace(/\/+$/, '') || '/'
  const destination = (path: string) =>
    path ? `${rootPath === '/' ? '' : rootPath}${path}` : rootPath

  return (
    <aside
      className={cn(
        'group/sidebar flex h-dvh w-sidebar max-w-full shrink-0 [scrollbar-width:thin] [scrollbar-color:#475569_transparent] flex-col gap-8 overflow-y-auto bg-ink px-4 py-6 text-start font-sans text-white data-[collapsed=true]:w-sidebar-collapsed',
        className,
      )}
      aria-label="Sidebar admin"
      data-collapsed={collapsed}
    >
      {!collapsed ? (
        <header className="flex min-w-0 flex-none flex-col gap-1 px-3 pe-[var(--sidebar-brand-padding-end,0.75rem)]">
          <Link
            className="block w-fit max-w-full"
            to={paths?.dashboard ?? rootPath}
            onClick={onNavigate}
            aria-label="WargaKita — dashboard admin"
          >
            <Logo className="max-w-full" alt="" />
          </Link>
          <p className="text-xs leading-normal font-semibold tracking-wider wrap-anywhere text-slate-400">
            {communityLabel}
          </p>
        </header>
      ) : null}

      <nav className="min-w-0 flex-none" aria-label="Navigasi admin">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {navigation.map(({ id, label, path, icon: Icon }) => (
            <li key={id}>
              <NavLink
                to={paths?.[id] ?? destination(path)}
                end={id === 'dashboard'}
                onClick={onNavigate}
                title={collapsed ? label : undefined}
                className="group/nav flex min-h-11 items-center gap-3 rounded-control px-3 py-2.5 text-sm leading-normal font-semibold text-slate-300 group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0 hover:bg-slate-800 hover:text-white aria-[current=page]:bg-brand aria-[current=page]:text-white"
              >
                <Icon
                  size={20}
                  strokeWidth={2}
                  className="shrink-0 text-slate-400 group-aria-[current=page]/nav:text-white"
                  aria-hidden="true"
                  focusable="false"
                />
                <span className="min-w-0 wrap-anywhere group-data-[collapsed=true]/sidebar:sr-only">
                  {label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {!collapsed ? (
        <footer
          className="mt-auto flex min-w-0 flex-none flex-col gap-0.5 px-3 text-start wrap-anywhere select-none"
          aria-hidden="true"
        >
          <Logo className="size-12" alt="" />
          <span className="text-xs leading-normal text-slate-400">
            Layanan Digital Warga
          </span>
        </footer>
      ) : null}
    </aside>
  )
}
