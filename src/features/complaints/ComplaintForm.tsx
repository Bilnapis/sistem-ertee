import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { Feedback } from '../../components/Feedback'
import { getSupabase } from '../../lib/supabase'
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalForm,
} from '../../components/Modal'
import { ComplaintSelect, ComplaintTextarea } from './ComplaintFields'
import {
  complaintCategories,
  complaintError,
  isComplaintCategory,
} from './data'
import type { ComplaintCategory } from './types'

export default function ComplaintForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const client = useQueryClient()
  const [requestId] = useState(() => crypto.randomUUID())
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ComplaintCategory | ''>('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<{
    title?: string
    category?: string
    description?: string
  }>({})
  const formRef = useRef<HTMLFormElement>(null)
  const close = () =>
    navigate({ pathname: '/warga/pengaduan', search: location.search })
  const submission = useMutation({
    mutationFn: async () => {
      const { data, error } = await getSupabase().rpc('submit_complaint', {
        p_request_id: requestId,
        p_title: title.trim(),
        p_description: description.trim(),
        p_category: category,
      })
      if (error) throw error
      return data
    },
    onSuccess: async (c) => {
      await client.invalidateQueries({ queryKey: ['complaints'] })
      navigate(
        { pathname: `/warga/pengaduan/${c.id}`, search: location.search },
        { replace: true, state: { complaintSubmitted: true } },
      )
    },
  })
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submission.isPending) return
    const next: typeof errors = {}
    if (!title.trim() || title.trim().length > 200)
      next.title = 'Isi judul pengaduan, maksimal 200 karakter.'
    if (!isComplaintCategory(category))
      next.category = 'Pilih kategori pengaduan.'
    if (!description.trim() || description.trim().length > 2000)
      next.description = 'Isi deskripsi pengaduan, maksimal 2.000 karakter.'
    setErrors(next)
    if (Object.keys(next).length) {
      window.requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      )
      return
    }
    submission.mutate()
  }
  return (
    <Modal
      title="Buat Pengaduan"
      description="Ceritakan permasalahan di lingkungan RT agar pengurus dapat menindaklanjutinya."
      onClose={close}
      pending={submission.isPending}
    >
      <ModalForm
        ref={formRef}
        noValidate
        onSubmit={submit}

        aria-busy={submission.isPending}
      >
        <ModalBody>
          <fieldset
            disabled={submission.isPending}
            className="m-0 grid min-w-0 grid-cols-2 gap-4 border-0 p-0 max-sm:grid-cols-1"
          >
            <legend className="sr-only">Informasi pengaduan</legend>
            <TextInput
              label="Judul pengaduan"
              required
              value={title}
              maxLength={200}
              error={errors.title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <ComplaintSelect
              label="Kategori pengaduan"
              required
              value={category}
              error={errors.category}
              onChange={(e) =>
                setCategory(e.target.value as ComplaintCategory | '')
              }
            >
              <option value="">Pilih kategori</option>
              {Object.entries(complaintCategories).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </ComplaintSelect>
            <div className="col-span-full">
              <ComplaintTextarea
                label="Deskripsi pengaduan"
                required
                value={description}
                maxLength={2000}
                error={errors.description}
                onChange={(e) => setDescription(e.target.value)}
                helperText="Jelaskan lokasi dan permasalahannya. Maksimal 2.000 karakter."
              />
            </div>
          </fieldset>
          <p className="rounded-summary border border-border bg-page px-4 py-3 text-sm leading-relaxed text-muted">
            Pengaduan yang dikirim dapat dibaca oleh Anda dan pengurus RT.
            Pantau status dan hasil penanganan melalui detail pengaduan.
          </p>
          {submission.isError ? (
            <Feedback>{complaintError(submission.error)}</Feedback>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            disabled={submission.isPending}
            onClick={close}
            variant="outline"
          >
            Batal
          </Button>
          <Button type="submit" disabled={submission.isPending} variant="solid">
            {submission.isPending ? 'Mengirim…' : 'Kirim Pengaduan'}
          </Button>
        </ModalFooter>
      </ModalForm>
    </Modal>
  )
}
