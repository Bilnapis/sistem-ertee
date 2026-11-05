import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Feedback } from '../../components/Feedback'
import { AnnouncementModal } from './AnnouncementModal'
import {
  AnnouncementPeriod,
  AnnouncementStatusBadge,
} from './AnnouncementParts'
import {
  announcementError,
  archiveAnnouncement,
  isAnnouncementConflict,
  useAnnouncement,
} from './data'
import { announcementStatus } from './schedule'

export default function AnnouncementDetails({
  manage = false,
}: {
  manage?: boolean
}) {
  const { id } = useParams()
  const query = useAnnouncement(id, manage ? 'manage' : 'active')
  const client = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [confirming, setConfirming] = useState(false)
  const base = `${manage ? '/admin' : '/warga'}/pengumuman`
  const close = () => navigate({ pathname: base, search: location.search })
  const archive = useMutation({
    mutationFn: archiveAnnouncement,
    onSuccess: async () => {
      setConfirming(false)
      await client.invalidateQueries({ queryKey: ['announcements'] })
    },
  })
  const data = query.announcement
  const stale = isAnnouncementConflict(archive.error)
  return (
    <AnnouncementModal
      title="Detail Pengumuman"
      onClose={close}
      pending={archive.isPending}
    >
      {query.isPending ? (
        <p role="status">Memuat detail pengumuman…</p>
      ) : query.isError ? (
        <div className="flex flex-col gap-3">
          <Feedback>{announcementError(query.error)}</Feedback>
          <button
            type="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            className="min-h-12 self-start rounded-control border border-border px-4 py-3 text-sm font-bold text-action"
          >
            Coba lagi detail
          </button>
        </div>
      ) : !data ? (
        <p role="status" className="text-sm text-muted">
          Pengumuman sudah tidak tayang. Silakan kembali ke daftar pengumuman.
        </p>
      ) : null}
      {data ? (
        <>
          {location.state?.announcementSaved || archive.isSuccess ? (
            <p
              role="status"
              className="mb-5 rounded-control bg-success-soft p-3 text-sm text-success"
            >
              {archive.isSuccess
                ? 'Pengumuman berhasil diarsipkan.'
                : 'Pengumuman berhasil disimpan.'}
            </p>
          ) : null}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 text-xl font-bold wrap-anywhere">
              {data.title}
            </h3>
            {manage && query.now !== undefined ? (
              <AnnouncementStatusBadge
                status={announcementStatus(data, query.now)}
              />
            ) : null}
          </div>
          <AnnouncementPeriod announcement={data} />
          <section className="mt-6" aria-label="Deskripsi pengumuman">
            <h3 className="mb-2 text-sm font-semibold">Deskripsi</h3>
            <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
              {data.description}
            </p>
          </section>
          {archive.isError ? (
            <div className="mt-5 flex flex-col gap-3">
              <Feedback>{announcementError(archive.error)}</Feedback>
              <button
                type="button"
                className="min-h-12 self-start rounded-control border border-border px-4 py-3 text-sm font-bold text-action"
                onClick={async () => {
                  const result = await query.refetch()
                  if (result.isSuccess) {
                    setConfirming(false)
                    archive.reset()
                  }
                }}
              >
                Muat ulang detail
              </button>
            </div>
          ) : null}
          {manage ? (
            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-border pt-6">
              {data.archived_at ? (
                <Link
                  className="inline-flex min-h-12 items-center rounded-control bg-action px-5 py-3 text-sm font-bold text-white hover:bg-action-hover"
                  to={{
                    pathname: `${base}/${data.id}/tayangkan-ulang`,
                    search: location.search,
                  }}
                >
                  Tayangkan ulang
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={archive.isPending || stale}
                    onClick={() => setConfirming(true)}
                    className="min-h-12 rounded-control border border-danger px-5 py-3 text-sm font-bold text-danger hover:bg-danger-soft"
                  >
                    Arsipkan
                  </button>
                  <Link
                    to={{
                      pathname: `${base}/${data.id}/edit`,
                      search: location.search,
                    }}
                    className="inline-flex min-h-12 items-center rounded-control bg-action px-5 py-3 text-sm font-bold text-white hover:bg-action-hover"
                  >
                    Edit Pengumuman
                  </Link>
                </>
              )}
            </div>
          ) : null}
          {confirming ? (
            <AnnouncementModal
              title="Arsipkan Pengumuman"
              description={`Arsipkan pengumuman “${data.title}”?`}
              kind="confirm"
              onClose={() => setConfirming(false)}
              pending={archive.isPending}
            >
              <p className="mb-6 text-sm leading-relaxed text-muted">
                Pengumuman akan berhenti tampil bagi pembaca. Data tetap
                tersedia bagi admin dan dapat ditayangkan ulang dengan memeriksa
                jadwal.
              </p>
              {archive.isError ? (
                <div className="mb-4">
                  <Feedback>{announcementError(archive.error)}</Feedback>
                </div>
              ) : null}
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  disabled={archive.isPending}
                  onClick={() => setConfirming(false)}
                  className="min-h-12 rounded-control border border-border px-5 py-3 text-sm font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={archive.isPending || stale}
                  onClick={() => archive.mutate(data)}
                  className="min-h-12 rounded-control bg-danger px-5 py-3 text-sm font-bold text-white"
                >
                  {archive.isPending ? 'Mengarsipkan…' : 'Ya, arsipkan'}
                </button>
              </div>
            </AnnouncementModal>
          ) : null}
        </>
      ) : null}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={archive.isPending}
          onClick={close}
          className="min-h-12 rounded-control border border-border px-5 py-3 text-sm font-bold text-slate-700 hover:bg-page"
        >
          Tutup
        </button>
      </div>
    </AnnouncementModal>
  )
}
