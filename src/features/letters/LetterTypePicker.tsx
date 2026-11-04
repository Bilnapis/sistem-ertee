import { useState } from 'react'
import { FileText, Search } from 'lucide-react'
import type { LetterType } from '../../lib/database.types'
import { TextInput } from '../../components/TextInput'
import { LetterModal } from './LetterModal'
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
    <LetterModal title="Pilih Jenis Surat" kind="picker" onClose={onClose}>
      <TextInput
        label="Cari jenis surat"
        placeholder="Cari jenis surat"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        leadingIcon={<Search size={20} />}
      />
      <fieldset className="m-0 mt-3 flex flex-col gap-2 border-0 p-0">
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
      <div className="mt-5 flex flex-wrap items-stretch justify-end gap-3 [&>button]:flex-1">
        <button
          type="button"
          className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
          onClick={onClose}
        >
          Batal
        </button>
        <button
          type="button"
          className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-action px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-white enabled:cursor-pointer enabled:hover:bg-action-hover disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 forced-colors:border-[ButtonText] [&>svg]:shrink-0"
          disabled={!selected}
          onClick={() => {
            if (selected) onSelect(selected)
          }}
        >
          Pilih Surat
        </button>
      </div>
    </LetterModal>
  )
}
