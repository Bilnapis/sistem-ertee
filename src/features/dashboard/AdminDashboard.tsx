import { useState } from 'react'
import { ArrowRight, ClipboardList, FileText, Wallet } from 'lucide-react'
import { Button, ButtonLink } from '../../components/Button'
import { Feedback } from '../../components/Feedback'
import { PageIntro } from '../../components/PageIntro'
import { SummaryCardView } from '../../components/SummaryCardView'
import {
  TableActionLink,
  TableBadge,
  TableCellText,
  TablePagination,
} from '../../components/TablePagination'
import type { TablePaginationColumn } from '../../components/TablePagination'
import type { LetterRequest } from '../../lib/database.types'
import { ComplaintStatusBadge } from '../complaints/ComplaintStatusBadge'
import { complaintError, useComplaints } from '../complaints/data'
import type { Complaint } from '../complaints/types'
import { duesError, monthLabel, rupiah, useDues } from '../dues/data'
import { letterError, letterStatuses, useLetters } from '../letters/data'
import { formatDate } from '../residents/data'

const complaintColumns: TablePaginationColumn<Complaint>[] = [
  {
    id: 'applicant',
    header: 'Nama warga',
    width: 22,
    rowHeader: true,
    render: (item) => (
      <TableCellText secondary={item.reference}>
        {item.identity_snapshot.full_name}
      </TableCellText>
    ),
  },
  { id: 'title', header: 'Pengaduan', width: 24, render: (item) => item.title },
  {
    id: 'date',
    header: 'Tanggal',
    width: 20,
    render: (item) => (
      <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    width: 20,
    render: (item) => <ComplaintStatusBadge status={item.status} />,
  },
  {
    id: 'action',
    header: 'Aksi',
    width: 14,
    render: (item) => (
      <TableActionLink
        to={`/admin/pengaduan/${item.id}`}
        aria-label={`Lihat pengaduan ${item.reference}`}
      >
        Lihat
      </TableActionLink>
    ),
  },
]

const letterColumns: TablePaginationColumn<LetterRequest>[] = [
  {
    id: 'applicant',
    header: 'Nama warga',
    width: 22,
    rowHeader: true,
    render: (item) => (
      <TableCellText secondary={item.reference}>
        {item.identity_snapshot.full_name}
      </TableCellText>
    ),
  },
  {
    id: 'type',
    header: 'Jenis surat',
    width: 24,
    render: (item) => item.letter_type_label,
  },
  {
    id: 'date',
    header: 'Tanggal',
    width: 20,
    render: (item) => (
      <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    width: 20,
    render: (item) => (
      <TableBadge
        tone={
          item.status === 'selesai'
            ? 'success'
            : item.status === 'diproses'
              ? 'info'
              : 'warning'
        }
      >
        {letterStatuses[item.status]}
      </TableBadge>
    ),
  },
  {
    id: 'action',
    header: 'Aksi',
    width: 14,
    render: (item) => (
      <TableActionLink
        to={`/admin/pengajuan-surat/${item.id}`}
        aria-label={`Lihat pengajuan ${item.reference}`}
      >
        Lihat
      </TableActionLink>
    ),
  },
]

export default function AdminDashboard() {
  const [complaintPage, setComplaintPage] = useState(1)
  const [letterPage, setLetterPage] = useState(1)
  const dues = useDues(true, {
    period: '',
    status: 'all',
    method: 'all',
    search: '',
    page: 1,
  })
  const complaints = useComplaints(true, {
    search: '',
    category: 'all',
    status: 'all',
    from: '',
    to: '',
    sort: 'newest',
    page: complaintPage,
  })
  const letters = useLetters(true, {
    search: '',
    type: 'all',
    status: 'all',
    sort: 'newest',
    page: letterPage,
  })

  return (
    <main
      className="@container/page min-w-0 flex-1 p-6 max-sm:px-4"
      aria-labelledby="dashboard-title"
    >
      <div className="mx-auto flex w-full max-w-[96rem] min-w-0 flex-col gap-6">
        <PageIntro
          id="dashboard-title"
          title="Dashboard"
          description="Ringkasan iuran dan layanan administrasi warga."
        />
        <section
          aria-label="Ringkasan dashboard"
          aria-busy={
            dues.isPending || complaints.isPending || letters.isPending
          }
        >
          <SummaryCardView
            columns={3}
            items={[
              {
                id: 'dues',
                label: 'Total iuran',
                icon: <Wallet size={20} />,
                value:
                  dues.isError || !dues.data
                    ? '—'
                    : rupiah(dues.data.summary.income),
                description: dues.data
                  ? `Penerimaan ${monthLabel(dues.data.period)}`
                  : 'Penerimaan bulan berjalan',
              },
              {
                id: 'letters',
                label: 'Jumlah pengajuan surat',
                icon: <FileText size={20} />,
                value: letters.isError ? '—' : (letters.data?.total ?? '—'),
                description: 'Seluruh pengajuan surat warga',
              },
              {
                id: 'complaints',
                label: 'Jumlah pengaduan',
                icon: <ClipboardList size={20} />,
                value: complaints.isError
                  ? '—'
                  : (complaints.data?.total ?? '—'),
                description: 'Seluruh pengaduan warga',
              },
            ]}
          />
          {dues.isError ? (
            <div className="mt-3 flex flex-col items-start gap-2">
              <Feedback>
                Total iuran belum dapat dimuat. {duesError(dues.error)}
              </Feedback>
              <Button
                type="button"
                variant="outline"
                disabled={dues.isFetching}
                onClick={() => void dues.refetch()}
              >
                Coba lagi iuran
              </Button>
            </div>
          ) : null}
        </section>
        <section
          className="min-w-0 rounded-lg border border-border bg-surface p-4"
          aria-labelledby="dashboard-complaints-title"
        >
          <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 id="dashboard-complaints-title" className="text-lg font-bold">
              Pengaduan warga
            </h2>
            <ButtonLink
              to="/admin/pengaduan"
              variant="ghost"
              size="text"
              trailingIcon={<ArrowRight size={16} aria-hidden="true" />}
              aria-label="Lihat semua pengaduan"
            >
              Lihat semua
            </ButtonLink>
          </header>
          <TablePagination
            caption="Pengaduan warga terbaru"
            columns={complaintColumns}
            items={complaints.data?.items ?? []}
            getRowKey={(item) => item.id}
            pagination={{
              page: complaintPage,
              pageSize: 4,
              total: complaints.data?.total ?? 0,
              itemLabel: 'pengaduan',
              label: 'Halaman pengaduan dashboard',
              onPageChange: setComplaintPage,
            }}
            isFetching={complaints.isFetching}
            isLoading={complaints.isPending}
            loadingMessage="Memuat pengaduan…"
            error={complaints.isError ? complaintError(complaints.error) : null}
            onRetry={() => void complaints.refetch()}
            emptyState={{
              icon: ClipboardList,
              description: 'Belum ada pengaduan warga.',
            }}
          />
        </section>
        <section
          className="min-w-0 rounded-lg border border-border bg-surface p-4"
          aria-labelledby="dashboard-letters-title"
        >
          <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 id="dashboard-letters-title" className="text-lg font-bold">
              Pengajuan surat
            </h2>
            <ButtonLink
              to="/admin/pengajuan-surat"
              variant="ghost"
              size="text"
              trailingIcon={<ArrowRight size={16} aria-hidden="true" />}
              aria-label="Lihat semua pengajuan surat"
            >
              Lihat semua
            </ButtonLink>
          </header>
          <TablePagination
            caption="Pengajuan surat warga terbaru"
            columns={letterColumns}
            items={letters.data?.items ?? []}
            getRowKey={(item) => item.id}
            pagination={{
              page: letterPage,
              pageSize: 4,
              total: letters.data?.total ?? 0,
              itemLabel: 'pengajuan',
              label: 'Halaman pengajuan surat dashboard',
              onPageChange: setLetterPage,
            }}
            isFetching={letters.isFetching}
            isLoading={letters.isPending}
            loadingMessage="Memuat pengajuan surat…"
            error={letters.isError ? letterError(letters.error) : null}
            onRetry={() => void letters.refetch()}
            emptyState={{
              icon: FileText,
              description: 'Belum ada pengajuan surat warga.',
            }}
          />
        </section>
      </div>
    </main>
  )
}
