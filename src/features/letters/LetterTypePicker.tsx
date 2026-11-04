import { useState } from 'react'
import { FileText, Search } from 'lucide-react'
import type { LetterType } from '../../lib/database.types'
import { TextInput } from '../../components/TextInput'
import { LetterModal } from './LetterModal'
import { letterTypes } from './data'
import styles from './Letters.module.css'

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
      <fieldset className={styles.typeList}>
        <legend className={styles.srOnly}>Jenis surat yang tersedia</legend>
        {options.map(([type, label]) => (
          <label
            key={type}
            className={styles.typeOption}
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
          <p className={styles.empty} role="status">
            Jenis surat tidak ditemukan.
          </p>
        ) : null}
      </fieldset>
      <div className={styles.pickerActions}>
        <button type="button" className={styles.secondary} onClick={onClose}>
          Batal
        </button>
        <button
          type="button"
          className={styles.primary}
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
