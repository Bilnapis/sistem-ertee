import { lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router'
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
const LettersPage = lazy(() => import('./features/letters/LettersPage'))
const LetterForm = lazy(() => import('./features/letters/LetterForm'))
const LetterDetails = lazy(() => import('./features/letters/LetterDetails'))
const DuesPage = lazy(() => import('./features/dues/DuesPage'))
const DuesPaymentForm = lazy(() => import('./features/dues/DuesPaymentForm'))
const DuesDetails = lazy(() => import('./features/dues/DuesDetails'))
const DuesSettings = lazy(() => import('./features/dues/DuesSettings'))

const AdminSidebarPreview = import.meta.env.DEV
  ? lazy(() => import('./previews/AdminSidebarPreview'))
  : null
const TextInputPreview = import.meta.env.DEV
  ? lazy(() => import('./previews/TextInputPreview'))
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
            <button
              className="inline-flex min-h-12 w-full max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-action px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-white enabled:cursor-pointer enabled:hover:bg-action-hover disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 forced-colors:border-[ButtonText] [&>svg]:shrink-0"
              onClick={retry}
            >
              Coba lagi
            </button>
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
        <Link
          to="/login"
          className="inline-flex min-h-12 w-full max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-action px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-white enabled:cursor-pointer enabled:hover:bg-action-hover disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 forced-colors:border-[ButtonText] [&>svg]:shrink-0"
        >
          Ke halaman masuk
        </Link>
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
      <Link
        to="/warga/profil"
        className="inline-flex min-h-11 max-w-full items-center gap-2 border-0 bg-transparent p-0 text-start text-sm leading-5 font-bold wrap-anywhere text-action hover:underline disabled:cursor-wait disabled:opacity-65 [&>svg]:shrink-0"
      >
        Kembali ke profil
      </Link>
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
              <Route element={<ProtectedLayout />}>
                <Route element={<ManagerOnly />}>
                  <Route
                    path="/admin/iuran-warga"
                    element={<DuesPage manage />}
                  >
                    <Route path="pengaturan" element={<DuesSettings />} />
                    <Route path=":id" element={<DuesDetails manage />} />
                  </Route>
                  <Route
                    path="/admin"
                    element={<Navigate to="/admin/warga" replace />}
                  />
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
                <Route path="/warga" element={<ResidentHome />} />
                <Route path="/warga/profil" element={<ResidentHome />} />
                <Route path="/warga/pengajuan-surat" element={<LettersPage />}>
                  <Route path="tambah" element={<LetterForm />} />
                  <Route path=":id" element={<LetterDetails />} />
                </Route>
                <Route path="/warga/iuran-warga" element={<DuesPage />}>
                  <Route path=":id" element={<DuesDetails />} />
                  <Route path=":id/bayar" element={<DuesPaymentForm />} />
                </Route>
                <Route
                  path="/warga/pengaduan/*"
                  element={
                    <UpcomingModule
                      title="Pengaduan"
                      description="Pengajuan dan status pengaduan Anda akan tersedia di sini."
                    />
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/warga" replace />} />
            </Routes>
          </Suspense>
        </ResidentQueryProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
