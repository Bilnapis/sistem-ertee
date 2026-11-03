import { AlertCircle, LoaderCircle } from 'lucide-react'

export function Feedback({ children }: { children: React.ReactNode }) {
  return <div className="feedback" role="alert"><AlertCircle size={18} aria-hidden="true" /><span>{children}</span></div>
}

export function LoadingScreen() {
  return <main className="center-screen"><p className="loading" role="status"><LoaderCircle className="spinner" size={22} aria-hidden="true" /> Menyiapkan layanan warga…</p></main>
}
