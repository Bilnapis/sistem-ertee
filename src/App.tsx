import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { Button, ButtonLink } from './components/Button'
import { AuthProvider, useAuth } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { ResidentHome } from './features/residents/ResidentHome'
import { SignOutButton } from './features/auth/SignOutButton'
import { AuthenticatedLayout } from './components/AuthenticatedLayout'
import { Feedback, LoadingScreen } from './components/Feedback'
import { isManager, ResidentQueryProvider } from './features/residents/data'

const ResidentsPage = lazy(() => import('./features/residents/ResidentsPage'))
const AdminDashboard = lazy(() => import('./features/dashboard/AdminDashboard'))
const ResidentDashboard = lazy(
  () => import('./features/dashboard/ResidentDashboard'),
)
const AnnouncementsPage = lazy(
  () => import('./features/announcements/AnnouncementsPage'),
)
const AnnouncementForm = lazy(
  () => import('./features/announcements/AnnouncementForm'),
)
const AnnouncementDetails = lazy(
  () => import('./features/announcements/AnnouncementDetails'),
)
const ResidentDialog = lazy(() => import('./features/residents/ResidentDialog'))
const LettersPage = lazy(() => import('./features/letters/LettersPage'))
const LetterForm = lazy(() => import('./features/letters/LetterForm'))
const LetterDetails = lazy(() => import('./features/letters/LetterDetails'))
const DuesPage = lazy(() => import('./features/dues/DuesPage'))
const DuesPaymentForm = lazy(() => import('./features/dues/DuesPaymentForm'))
const DuesDetails = lazy(() => import('./features/dues/DuesDetails'))
const DuesSettings = lazy(() => import('./features/dues/DuesSettings'))
const ComplaintsPage = lazy(
  () => import('./features/complaints/ComplaintsPage'),
)
const ComplaintForm = lazy(() => import('./features/complaints/ComplaintForm'))
const ComplaintDetails = lazy(
  () => import('./features/complaints/ComplaintDetails'),
)

const AdminSidebarPreview = import.meta.env.DEV
  ? lazy(() => import('./previews/AdminSidebarPreview'))
  : null
const TextInputPreview = import.meta.env.DEV
  ? lazy(() => import('./previews/TextInputPreview'))
  : null
const ButtonPreview = import.meta.env.DEV
  ? lazy(() => import('./previews/ButtonPreview'))
  : null

function GuestLayout() {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return session ? <Navigate to="/warga" replace /> : <Outlet />
}

function ProtectedLayout() {
  const { session, loading, error, retry } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (error)
    return (
      <main className="grid min-h-svh place-items-center p-6">
        <section className="flex w-full max-w-[560px] flex-col gap-6 rounded-card bg-surface p-8 shadow-card">
          <h1>Akses belum tersedia</h1>
          <Feedback>{error}</Feedback>
          <div className="flex flex-col gap-3">
            <Button onClick={retry} variant="solid" width="full">
              Coba lagi
            </Button>
            <SignOutButton />
          </div>
        </section>
      </main>
    )
  return <AuthenticatedLayout />
}

function AuthCallback() {
  const { loading, session } = useAuth()
  if (loading) return <LoadingScreen />
  if (session) return <Navigate to="/warga" replace />
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <section className="flex w-full max-w-[560px] flex-col gap-6 rounded-card bg-surface p-10 text-center shadow-card max-sm:px-6 max-sm:py-7 [&>p]:text-sm [&>p]:leading-6 [&>p]:text-muted">
        <h1>Konfirmasi akun</h1>
        <p>
          Tautan konfirmasi tidak valid, sudah digunakan, atau dibuka di browser
          berbeda. Jika email sudah dikonfirmasi, silakan masuk dengan email dan
          password Anda.
        </p>
        <ButtonLink to="/login" variant="solid" width="full">
          Ke halaman masuk
        </ButtonLink>
      </section>
    </main>
  )
}

function ManagerOnly() {
  const { profile } = useAuth()
  return isManager(profile?.role) ? (
    <Outlet />
  ) : (
    <main className="@container/page mx-auto w-full max-w-[1088px] flex-1 px-6 py-12 max-sm:px-4 max-sm:py-8">
      <h1>Akses ditolak</h1>
      <p>Halaman pengelolaan hanya tersedia bagi Ketua RT dan Pengurus RT.</p>
      <ButtonLink to="/warga/profil" variant="ghost" size="text" align="start">
        Kembali ke profil
      </ButtonLink>
    </main>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ResidentQueryProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route element={<GuestLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
              <Route path="/auth/callback" element={<AuthCallback />} />
              {AdminSidebarPreview ? (
                <Route
                  path="/preview/admin-sidebar/*"
                  element={
                    <Suspense fallback={<LoadingScreen />}>
                      <AdminSidebarPreview />
                    </Suspense>
                  }
                />
              ) : null}
              {TextInputPreview ? (
                <Route
                  path="/preview/text-input"
                  element={<TextInputPreview />}
                />
              ) : null}
              {ButtonPreview ? (
                <Route path="/preview/button" element={<ButtonPreview />} />
              ) : null}
              <Route element={<ProtectedLayout />}>
                <Route element={<ManagerOnly />}>
                  <Route
                    path="/admin/pengumuman"
                    element={<AnnouncementsPage manage />}
                  >
                    <Route
                      path="tambah"
                      element={<AnnouncementForm mode="create" />}
                    />
                    <Route
                      path=":id"
                      element={<AnnouncementDetails manage />}
                    />
                    <Route
                      path=":id/edit"
                      element={<AnnouncementForm mode="edit" />}
                    />
                    <Route
                      path=":id/tayangkan-ulang"
                      element={<AnnouncementForm mode="republish" />}
                    />
                  </Route>
                  <Route
                    path="/admin/pengaduan"
                    element={<ComplaintsPage manage />}
                  >
                    <Route path=":id" element={<ComplaintDetails manage />} />
                  </Route>
                  <Route
                    path="/admin/iuran-warga"
                    element={<DuesPage manage />}
                  >
                    <Route path="pengaturan" element={<DuesSettings />} />
                    <Route path=":id" element={<DuesDetails manage />} />
                  </Route>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/warga" element={<ResidentsPage />}>
                    <Route
                      path="tambah"
                      element={<ResidentDialog mode="create" />}
                    />
                    <Route
                      path=":id"
                      element={<ResidentDialog mode="view" />}
                    />
                    <Route
                      path=":id/edit"
                      element={<ResidentDialog mode="edit" />}
                    />
                  </Route>
                  <Route
                    path="/admin/pengajuan-surat"
                    element={<LettersPage manage />}
                  >
                    <Route path=":id" element={<LetterDetails manage />} />
                  </Route>
                </Route>
                <Route path="/warga" element={<ResidentDashboard />} />
                <Route path="/warga/pengumuman" element={<AnnouncementsPage />}>
                  <Route path=":id" element={<AnnouncementDetails />} />
                </Route>
                <Route path="/warga/profil" element={<ResidentHome />} />
                <Route path="/warga/pengajuan-surat" element={<LettersPage />}>
                  <Route path="tambah" element={<LetterForm />} />
                  <Route path=":id" element={<LetterDetails />} />
                </Route>
                <Route path="/warga/iuran-warga" element={<DuesPage />}>
                  <Route path=":id" element={<DuesDetails />} />
                  <Route path=":id/bayar" element={<DuesPaymentForm />} />
                </Route>
                <Route path="/warga/pengaduan" element={<ComplaintsPage />}>
                  <Route path="tambah" element={<ComplaintForm />} />
                  <Route path=":id" element={<ComplaintDetails />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/warga" replace />} />
            </Routes>
          </Suspense>
        </ResidentQueryProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
