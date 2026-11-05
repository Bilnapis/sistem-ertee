import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Button, ButtonLink } from '../../components/Button'
import { Feedback } from '../../components/Feedback'
import { Modal, ModalBody, ModalFooter } from '../../components/Modal'
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
    <Modal
      title="Detail Pengumuman"
      onClose={close}
      pending={archive.isPending}
    >
      <ModalBody>
        {query.isPending ? (
          <p role="status">Memuat detail pengumuman…</p>
        ) : query.isError ? (
          <div className="flex flex-col gap-3">
            <Feedback>{announcementError(query.error)}</Feedback>
            <Button
              type="button"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
              variant="outline"
            >
              Coba lagi detail
            </Button>
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
                className="rounded-control bg-success-soft p-3 text-sm text-success"
              >
                {archive.isSuccess
                  ? 'Pengumuman berhasil diarsipkan.'
                  : 'Pengumuman berhasil disimpan.'}
              </p>
            ) : null}
            <div className="flex flex-wrap items-start justify-between gap-3">
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
            <section aria-label="Deskripsi pengumuman">
              <h3 className="mb-2 text-sm font-semibold">Deskripsi</h3>
              <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
                {data.description}
              </p>
            </section>
            {archive.isError ? (
              <div className="flex flex-col gap-3">
                <Feedback>{announcementError(archive.error)}</Feedback>
                <Button
                  type="button"
                  onClick={async () => {
                    const result = await query.refetch()
                    if (result.isSuccess) {
                      setConfirming(false)
                      archive.reset()
                    }
                  }}
                  variant="outline"
                >
                  Muat ulang detail
                </Button>
              </div>
            ) : null}

            {confirming ? (
              <Modal
                title="Arsipkan Pengumuman"
                description={`Arsipkan pengumuman “${data.title}”?`}
                onClose={() => setConfirming(false)}
                pending={archive.isPending}
              >
                <ModalBody>
                  <p className="text-sm leading-relaxed text-muted">
                    Pengumuman akan berhenti tampil bagi pembaca. Data tetap
                    tersedia bagi admin dan dapat ditayangkan ulang dengan
                    memeriksa jadwal.
                  </p>
                  {archive.isError ? (
                    <div>
                      <Feedback>{announcementError(archive.error)}</Feedback>
                    </div>
                  ) : null}
                </ModalBody>
                <ModalFooter>
                  <Button
                    type="button"
                    disabled={archive.isPending}
                    onClick={() => setConfirming(false)}
                    variant="outline"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    disabled={archive.isPending || stale}
                    onClick={() => archive.mutate(data)}
                    variant="danger"
                  >
                    {archive.isPending ? 'Mengarsipkan…' : 'Ya, arsipkan'}
                  </Button>
                </ModalFooter>
              </Modal>
            ) : null}
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        {manage && data ? (
          <>
            {data.archived_at ? (
              <ButtonLink
                variant="solid"
                to={{
                  pathname: `${base}/${data.id}/tayangkan-ulang`,
                  search: location.search,
                }}
              >
                Tayangkan ulang
              </ButtonLink>
            ) : (
              <>
                <Button
                  type="button"
                  disabled={archive.isPending || stale}
                  onClick={() => setConfirming(true)}
                  variant="danger"
                >
                  Arsipkan
                </Button>
                <ButtonLink
                  to={{
                    pathname: `${base}/${data.id}/edit`,
                    search: location.search,
                  }}
                  variant="solid"
                >
                  Edit Pengumuman
                </ButtonLink>
              </>
            )}
          </>
        ) : null}
        <Button
          type="button"
          disabled={archive.isPending}
          onClick={close}
          variant="outline"
        >
          Tutup
        </Button>
      </ModalFooter>
    </Modal>
  )
}
