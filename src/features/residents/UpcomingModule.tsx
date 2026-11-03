import { Link } from 'react-router'

export function UpcomingModule({ title, description }: { title: string; description: string }) {
  return <main className="resident-main">
    <div className="resident-welcome"><p className="eyebrow">LAYANAN WARGA</p><h1>{title}</h1></div>
    <section className="profile-card">
      <h2 className="text-xl font-bold">Layanan sedang disiapkan</h2>
      <p className="mt-3 mb-6 leading-6 text-muted">{description}</p>
      <Link className="text-link" to="/warga">Kembali ke dashboard</Link>
    </section>
  </main>
}
