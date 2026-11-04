import { buttons } from '../components/ui'
import { Link, useLocation } from 'react-router'
import { AdminSidebar } from '../components/AdminSidebar'

const basePath = '/preview/admin-sidebar'
const pageLabels: Record<string, string> = {
  '': 'Dashboard',
  warga: 'Warga',
  'pengajuan-surat': 'Pengajuan Surat',
  'iuran-warga': 'Iuran Warga',
  pengaduan: 'Pengaduan',
}

export default function AdminSidebarPreview() {
  const { pathname } = useLocation()
  const section =
    pathname.slice(basePath.length).split('/').filter(Boolean)[0] ?? ''

  return (
    <div className="flex min-h-svh max-md:flex-col max-md:items-center">
      <AdminSidebar communityLabel="ADMIN RT 04" basePath={basePath} />
      <main className="flex min-w-0 flex-1 flex-col items-start gap-4 p-12 max-md:w-full max-md:p-6 [&>p]:leading-6 [&>p]:text-muted">
        <p className="text-sm font-bold text-action!">Pratinjau komponen</p>
        <h1>{pageLabels[section] ?? 'Sidebar admin'}</h1>
        <p>
          Sidebar admin ErTee sesuai desain. Pilih menu untuk melihat penanda
          navigasi aktif.
        </p>
        <Link to="/login" className={buttons.text}>
          Kembali ke halaman masuk
        </Link>
      </main>
    </div>
  )
}
