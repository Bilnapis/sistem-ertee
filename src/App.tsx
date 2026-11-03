import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { ResidentHome } from './features/residents/ResidentHome'
import { SignOutButton } from './features/auth/SignOutButton'
import { UpcomingModule } from './features/residents/UpcomingModule'
import { AuthenticatedLayout } from './components/AuthenticatedLayout'
import { Feedback, LoadingScreen } from './components/Feedback'
import { isManager, ResidentQueryProvider } from './features/residents/data'

const ResidentsPage = lazy(() => import('./features/residents/ResidentsPage'))
const ResidentDialog = lazy(() => import('./features/residents/ResidentDialog'))

const AdminSidebarPreview = import.meta.env.DEV ? lazy(() => import('./previews/AdminSidebarPreview')) : null
const TextInputPreview = import.meta.env.DEV ? lazy(() => import('./previews/TextInputPreview')) : null

function GuestLayout() {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return session ? <Navigate to="/warga" replace /> : <Outlet />
}

function ProtectedLayout() {
  const { session, loading, error, retry } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (error) return <main className="center-screen"><section className="auth-card error-card"><h1>Akses belum tersedia</h1><Feedback>{error}</Feedback><div className="error-actions"><button className="primary-button" onClick={retry}>Coba lagi</button><SignOutButton /></div></section></main>
  return <AuthenticatedLayout />
}

function AuthCallback() {
  const { loading, session } = useAuth()
  if (loading) return <LoadingScreen />
  if (session) return <Navigate to="/warga" replace />
  return <main className="center-screen"><section className="auth-card confirmation-card"><h1>Konfirmasi akun</h1><p>Tautan konfirmasi tidak valid, sudah digunakan, atau dibuka di browser berbeda. Jika email sudah dikonfirmasi, silakan masuk dengan email dan password Anda.</p><Link to="/login" className="primary-button">Ke halaman masuk</Link></section></main>
}

function ManagerOnly() {
  const { profile } = useAuth()
  return isManager(profile?.role) ? <Outlet /> : <main className="resident-main"><h1>Akses ditolak</h1><p>Halaman manajemen warga hanya tersedia bagi Ketua RT dan Pengurus RT.</p><Link to="/warga/profil" className="text-link">Kembali ke profil</Link></main>
}

export function App() {
  return <BrowserRouter><AuthProvider><ResidentQueryProvider><Suspense fallback={<LoadingScreen />}><Routes>
    <Route element={<GuestLayout />}><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /></Route>
    <Route path="/auth/callback" element={<AuthCallback />} />
    {AdminSidebarPreview ? <Route path="/preview/admin-sidebar/*" element={<Suspense fallback={<LoadingScreen />}><AdminSidebarPreview /></Suspense>} /> : null}
    {TextInputPreview ? <Route path="/preview/text-input" element={<TextInputPreview />} /> : null}
    <Route element={<ProtectedLayout />}>
      <Route element={<ManagerOnly />}>
        <Route path="/admin" element={<Navigate to="/admin/warga" replace />} />
        <Route path="/admin/warga" element={<ResidentsPage />}>
          <Route path="tambah" element={<ResidentDialog mode="create" />} />
          <Route path=":id" element={<ResidentDialog mode="view" />} />
          <Route path=":id/edit" element={<ResidentDialog mode="edit" />} />
        </Route>
      </Route>
      <Route path="/warga" element={<ResidentHome />} />
      <Route path="/warga/profil" element={<ResidentHome />} />
      <Route path="/warga/pengajuan-surat/*" element={<UpcomingModule title="Pengajuan Surat" description="Pengajuan dan riwayat surat Anda akan tersedia di sini." />} />
      <Route path="/warga/iuran-warga/*" element={<UpcomingModule title="Iuran Warga" description="Riwayat pembayaran iuran Anda akan tersedia di sini." />} />
      <Route path="/warga/pengaduan/*" element={<UpcomingModule title="Pengaduan" description="Pengajuan dan status pengaduan Anda akan tersedia di sini." />} />
    </Route>
    <Route path="*" element={<Navigate to="/warga" replace />} />
  </Routes></Suspense></ResidentQueryProvider></AuthProvider></BrowserRouter>
}
