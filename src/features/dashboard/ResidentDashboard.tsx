import { ArrowRight, Bell, FileText, MessageSquare, Wallet } from 'lucide-react'
import { ButtonLink } from '../../components/Button'
import { PageIntro } from '../../components/PageIntro'

const shortcuts = [
  {
    title: 'Pengajuan Surat',
    description: 'Ajukan permohonan surat dengan mudah.',
    action: 'Ajukan Surat',
    to: '/warga/pengajuan-surat/tambah',
    icon: FileText,
  },
  {
    title: 'Iuran Warga',
    description: 'Lihat tagihan dan riwayat pembayaran.',
    action: 'Lihat Iuran',
    to: '/warga/iuran-warga',
    icon: Wallet,
  },
  {
    title: 'Pengaduan',
    description: 'Laporkan kendala lingkungan Anda.',
    action: 'Buat Pengaduan',
    to: '/warga/pengaduan/tambah',
    icon: MessageSquare,
  },
  {
    title: 'Pengumuman',
    description: 'Lihat informasi terbaru dari pengurus.',
    action: 'Lihat Pengumuman',
    to: '/warga/pengumuman',
    icon: Bell,
  },
]

export default function ResidentDashboard() {
  return (
    <main
      className="@container/page min-w-0 flex-1 p-6 max-sm:px-4"
      aria-labelledby="dashboard-title"
    >
      <div className="mx-auto flex w-full max-w-[96rem] min-w-0 flex-col gap-6">
        <PageIntro
          id="dashboard-title"
          title="Dashboard"
          description="Akses layanan dan informasi warga dengan mudah."
        />
        <section
          className="grid grid-cols-4 gap-4 @max-[60rem]/page:grid-cols-2 @max-[33rem]/page:grid-cols-1"
          aria-label="Layanan warga"
        >
          {shortcuts.map(({ title, description, action, to, icon: Icon }) => (
            <article
              key={to}
              className="flex min-w-0 flex-col rounded-card border border-border bg-surface p-5"
            >
              <div className="mb-4 grid size-10 place-items-center rounded-control bg-green-50 text-brand">
                <Icon size={20} aria-hidden="true" />
              </div>
              <h2 className="text-base leading-6 font-bold">{title}</h2>
              <p className="mt-1.5 mb-4 text-xs leading-normal text-muted">
                {description}
              </p>
              <div className="mt-auto">
                <ButtonLink
                  to={to}
                  variant="ghost"
                  size="text"
                  width="full"
                  align="between"
                  trailingIcon={<ArrowRight size={16} aria-hidden="true" />}
                >
                  {action}
                </ButtonLink>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
