import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { ResidentHome, SignOutButton } from './features/residents/ResidentHome'
import { Feedback, LoadingScreen } from './components/Feedback'

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
  return <Outlet />
}

function AuthCallback() {
  const { loading, session } = useAuth()
  if (loading) return <LoadingScreen />
  if (session) return <Navigate to="/warga" replace />
  return <main className="center-screen"><section className="auth-card confirmation-card"><h1>Konfirmasi akun</h1><p>Tautan konfirmasi tidak valid, sudah digunakan, atau dibuka di browser berbeda. Jika email sudah dikonfirmasi, silakan masuk dengan email dan password Anda.</p><Link to="/login" className="primary-button">Ke halaman masuk</Link></section></main>
}

export function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route element={<GuestLayout />}><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /></Route>
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route element={<ProtectedLayout />}><Route path="/warga" element={<ResidentHome />} /></Route>
    <Route path="*" element={<Navigate to="/warga" replace />} />
  </Routes></AuthProvider></BrowserRouter>
}
