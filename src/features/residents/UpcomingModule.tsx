import { buttons } from '../../components/ui'
import { Link } from 'react-router'

export function UpcomingModule({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <main className="@container/page mx-auto w-full max-w-[1088px] flex-1 px-6 py-12 max-sm:px-4 max-sm:py-8">
      <div className="mb-8 [&>p:last-child]:mt-2 [&>p:last-child]:leading-6 [&>p:last-child]:text-muted">
        <p className="mb-2 text-xs font-bold tracking-[0.075rem] text-action">
          LAYANAN WARGA
        </p>
        <h1>{title}</h1>
      </div>
      <section className="rounded-card border border-border bg-surface p-8 max-sm:p-6">
        <h2 className="text-xl font-bold">Layanan sedang disiapkan</h2>
        <p className="mt-3 mb-6 leading-6 text-muted">{description}</p>
        <Link className={buttons.text} to="/warga">
          Kembali ke dashboard
        </Link>
      </section>
    </main>
  )
}
