import { useState } from 'react'
import { FileText, Search } from 'lucide-react'
import type { LetterType } from '../../lib/database.types'
import { TextInput } from '../../components/TextInput'
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalButton,
} from '../../components/Modal'
import { letterTypes } from './data'

export function LetterTypePicker({
  value,
  onSelect,
  onClose,
}: {
  value: LetterType | ''
  onSelect: (type: LetterType) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(value)
  const options = (
    Object.entries(letterTypes) as [LetterType, string][]
  ).filter(([, label]) =>
    label
      .toLocaleLowerCase('id-ID')
      .includes(search.toLocaleLowerCase('id-ID')),
  )
  return (
    <Modal title="Pilih Jenis Surat" onClose={onClose}>
      <ModalBody>
        <TextInput
          label="Cari jenis surat"
          placeholder="Cari jenis surat"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          leadingIcon={<Search size={20} />}
        />
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="sr-only">Jenis surat yang tersedia</legend>
          {options.map(([type, label]) => (
            <label
              key={type}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-4 py-3 text-base leading-normal text-slate-700 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus data-[selected=true]:bg-emerald-50 data-[selected=true]:font-bold data-[selected=true]:text-success max-sm:px-3 forced-colors:data-[selected=true]:border forced-colors:data-[selected=true]:border-[CanvasText] [&>input]:m-0 [&>input]:size-[18px] [&>input]:shrink-0 [&>input]:accent-action [&>span]:min-w-0 [&>span]:flex-1 [&>svg]:shrink-0 [&>svg]:text-muted data-[selected=true]:[&>svg]:text-action"
              data-selected={selected === type || undefined}
            >
              <FileText size={20} aria-hidden="true" />
              <span>{label}</span>
              <input
                type="radio"
                name="letter-type"
                value={type}
                checked={selected === type}
                onChange={() => setSelected(type)}
              />
            </label>
          ))}
          {!options.length ? (
            <p
              className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-5 py-12 text-center leading-normal text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink"
              role="status"
            >
              Jenis surat tidak ditemukan.
            </p>
          ) : null}
        </fieldset>
      </ModalBody>
      <ModalFooter>
        <ModalButton type="button" variant="secondary" onClick={onClose}>
          Batal
        </ModalButton>
        <ModalButton
          type="button"
          variant="primary"
          disabled={!selected}
          onClick={() => {
            if (selected) onSelect(selected)
          }}
        >
          Pilih Surat
        </ModalButton>
      </ModalFooter>
    </Modal>
  )
}
