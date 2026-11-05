import { useId, useState } from 'react'
import { Menu, Sidebar } from 'lucide-react'
import { Outlet } from 'react-router'
import { useAuth } from '../features/auth/AuthProvider'
import { SignOutButton } from '../features/auth/SignOutButton'
import { AdminSidebar } from './AdminSidebar'
import { AccountMenu } from './AccountMenu'
import { Modal } from './Modal'
import { isManager } from '../features/residents/data'

export function AuthenticatedLayout() {
  const { profile } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const sidebarId = useId()
  const drawerId = useId()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  if (!profile) return null
  const sidebarProps = {
    communityLabel: `${profile.role === 'warga' ? 'WARGA' : 'ADMIN'} RT 04`,
    basePath: '/warga',
    paths: {
      pengumuman: isManager(profile.role)
        ? '/admin/pengumuman'
        : '/warga/pengumuman',
      pengaduan: isManager(profile.role)
        ? '/admin/pengaduan'
        : '/warga/pengaduan',
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
    <div
      className="grid min-h-dvh grid-cols-[minmax(0,1fr)] lg:grid-cols-[var(--spacing-sidebar)_minmax(0,1fr)] lg:data-[sidebar-collapsed=true]:grid-cols-[var(--spacing-sidebar-collapsed)_minmax(0,1fr)]"
      data-sidebar-collapsed={sidebarCollapsed}
    >
      <div id={sidebarId} className="sticky top-0 h-dvh min-w-0 max-lg:hidden">
        <AdminSidebar {...sidebarProps} collapsed={sidebarCollapsed} />
      </div>
      <div className="@container/authenticated-content flex min-h-dvh min-w-0 flex-col">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex min-h-19 w-full max-w-[96rem] flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-4 @max-[33rem]/authenticated-content:min-h-17 @max-[33rem]/authenticated-content:gap-x-4 @max-[33rem]/authenticated-content:gap-y-3 @max-[33rem]/authenticated-content:px-4 @max-[33rem]/authenticated-content:py-3">
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-control bg-surface p-0 text-ink hover:bg-soft max-lg:hidden"
                aria-label={
                  sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'
                }
                title={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
                aria-controls={sidebarId}
                aria-expanded={!sidebarCollapsed}
                onClick={() => setSidebarCollapsed((previous) => !previous)}
              >
                {sidebarCollapsed ? (
                  <Sidebar size={20} aria-hidden="true" />
                ) : (
                  <Sidebar size={20} aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                className="hidden min-h-11 w-11 shrink-0 place-items-center rounded-control border border-border bg-surface p-0 text-ink hover:bg-soft max-lg:grid"
                aria-label="Buka menu navigasi"
                aria-haspopup="dialog"
                aria-controls={drawerId}
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
              >
                <Menu size={20} aria-hidden="true" />
              </button>
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
      {drawerOpen ? (
        <Modal
          id={drawerId}
          title="Menu navigasi"
          placement="start"
          onClose={() => setDrawerOpen(false)}
        >
          <AdminSidebar
            {...sidebarProps}
            className="h-full overscroll-y-contain [--sidebar-brand-padding-end:2.75rem]"
            onNavigate={() => setDrawerOpen(false)}
          />
        </Modal>
      ) : null}
    </div>
  )
}
