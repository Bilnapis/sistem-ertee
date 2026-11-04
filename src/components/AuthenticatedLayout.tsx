import { useRef } from 'react'
import { Menu, X } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { useAuth } from '../features/auth/AuthProvider'
import { SignOutButton } from '../features/auth/SignOutButton'
import { AdminSidebar } from './AdminSidebar'
import { AccountMenu } from './AccountMenu'
import { isManager } from '../features/residents/data'

export function AuthenticatedLayout() {
  const { profile } = useAuth()
  const drawer = useRef<HTMLDialogElement>(null)
  if (!profile) return null
  const sidebarProps = {
    communityLabel: `${profile.role === 'warga' ? 'WARGA' : 'ADMIN'} RT 04`,
    basePath: '/warga',
    paths: {
      iuran: isManager(profile.role)
        ? '/admin/iuran-warga'
        : '/warga/iuran-warga',
      warga: isManager(profile.role) ? '/admin/warga' : '/warga/profil',
      surat: isManager(profile.role)
        ? '/admin/pengajuan-surat'
        : '/warga/pengajuan-surat',
    },
  }

  return (
    <div className="grid min-h-dvh grid-cols-[var(--spacing-sidebar)_minmax(0,1fr)] max-lg:grid-cols-[minmax(0,1fr)]">
      <div className="sticky top-0 h-dvh min-w-0 max-lg:hidden">
        <AdminSidebar {...sidebarProps} />
      </div>
      <div className="@container/authenticated-content flex min-h-dvh min-w-0 flex-col">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex min-h-19 w-full max-w-[96rem] flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-4 @max-[33rem]/authenticated-content:min-h-17 @max-[33rem]/authenticated-content:gap-x-4 @max-[33rem]/authenticated-content:gap-y-3 @max-[33rem]/authenticated-content:px-4 @max-[33rem]/authenticated-content:py-3">
            <div className="flex min-w-[min(100%,10rem)] flex-[1_1_10rem] items-center gap-3 @max-[33rem]/authenticated-content:min-w-0 @max-[33rem]/authenticated-content:flex-none">
              <button
                type="button"
                className="hidden min-h-11 w-11 shrink-0 place-items-center rounded-control border border-border bg-surface p-0 text-ink hover:bg-soft max-lg:grid"
                aria-label="Buka menu navigasi"
                aria-haspopup="dialog"
                onClick={() => drawer.current?.showModal()}
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              <Link
                className="flex min-w-0 flex-col gap-0.5 text-start wrap-anywhere"
                to="/warga"
              >
                <span className="text-xl leading-[1.2] font-extrabold tracking-[-0.02em] text-brand">
                  ErTee
                </span>
                <span className="text-xs leading-normal text-muted @max-[33rem]/authenticated-content:hidden">
                  Layanan Digital Warga
                </span>
              </Link>
            </div>
            <div className="ms-auto max-w-full min-w-0 flex-[0_1_auto] wrap-anywhere @max-[33rem]/authenticated-content:max-w-80 @max-[33rem]/authenticated-content:min-w-[min(100%,10rem)] @max-[33rem]/authenticated-content:flex-[1_1_0]">
              <AccountMenu profile={profile} />
            </div>
          </div>
        </header>

        <Outlet />
        <footer className="flex flex-wrap items-center justify-between gap-4 p-6 text-center text-xs text-muted">
          <span>© ErTee • Layanan Digital Warga</span>
          <SignOutButton />
        </footer>
      </div>
      <dialog
        ref={drawer}
        className="app-drawer fixed inset-y-0 start-0 end-auto m-0 h-dvh max-h-dvh w-sidebar max-w-[calc(100%-1.5rem)] overflow-hidden border-0 bg-transparent p-0"
        aria-label="Menu navigasi"
        closedby="any"
      >
        <button
          type="button"
          className="absolute start-auto end-3 top-4 z-1 grid size-11 place-items-center rounded-control border-0 bg-transparent p-0 text-slate-300 hover:bg-slate-800"
          aria-label="Tutup menu navigasi"
          onClick={() => drawer.current?.close()}
        >
          <X size={24} aria-hidden="true" />
        </button>
        <AdminSidebar
          {...sidebarProps}
          className="h-full overscroll-y-contain [--sidebar-brand-padding-end:2.75rem]"
          onNavigate={() => drawer.current?.close()}
        />
      </dialog>
    </div>
  )
}
