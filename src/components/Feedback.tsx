import { AlertCircle, LoaderCircle } from 'lucide-react'

export function Feedback({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 rounded-control border border-red-200 bg-red-50 p-3 text-sm leading-normal text-red-800 [&>svg]:mt-0.5 [&>svg]:shrink-0"
      role="alert"
    >
      <AlertCircle size={18} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

export function LoadingScreen() {
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <p className="flex items-center gap-3 text-muted" role="status">
        <LoaderCircle
          className="motion-safe:animate-spin"
          size={22}
          aria-hidden="true"
        />{' '}
        Menyiapkan layanan warga…
      </p>
    </main>
  )
}
