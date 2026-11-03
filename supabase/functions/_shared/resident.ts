export type ResidentRole = 'ketua_rt' | 'pengurus_rt' | 'warga'
export type Gender = 'laki_laki' | 'perempuan'
export type MaritalStatus = 'belum_menikah' | 'menikah'
export type ResidentFields = {
  full_name: string
  nik: string
  family_card_number: string
  gender: Gender | ''
  marital_status: MaritalStatus | ''
  house_block: string
  house_number: string
  phone: string
  address: string
}
export type FieldErrors = Partial<Record<keyof ResidentFields | 'email' | 'password' | 'confirmation' | 'role', string>>
export const roles: ResidentRole[] = ['ketua_rt', 'pengurus_rt', 'warga']
export const emptyResident: ResidentFields = {
  full_name: '', nik: '', family_card_number: '', gender: '', marital_status: '',
  house_block: '', house_number: '', phone: '', address: '',
}

export function normalizeResident(input: Record<string, unknown>): ResidentFields {
  const text = (key: string) => typeof input[key] === 'string' ? input[key].trim() : ''
  return {
    full_name: text('full_name'), nik: text('nik'), family_card_number: text('family_card_number'),
    gender: text('gender') as ResidentFields['gender'], marital_status: text('marital_status') as ResidentFields['marital_status'],
    house_block: text('house_block'), house_number: text('house_number'),
    phone: text('phone').replace(/[\s().-]/g, ''), address: text('address'),
  }
}

export function validateResident(values: ResidentFields): FieldErrors {
  const errors: FieldErrors = {}
  if (values.full_name.length < 2 || values.full_name.length > 150) errors.full_name = 'Isi nama lengkap, 2–150 karakter.'
  if (!/^\d{16}$/.test(values.nik)) errors.nik = 'NIK harus berisi tepat 16 digit angka.'
  if (!/^\d{16}$/.test(values.family_card_number)) errors.family_card_number = 'Nomor KK harus berisi tepat 16 digit angka.'
  if (!['laki_laki', 'perempuan'].includes(values.gender)) errors.gender = 'Pilih jenis kelamin.'
  if (!['belum_menikah', 'menikah'].includes(values.marital_status)) errors.marital_status = 'Pilih status pernikahan.'
  if (!values.house_block || values.house_block.length > 50) errors.house_block = 'Isi blok rumah, maksimal 50 karakter.'
  if (values.house_number.length > 30) errors.house_number = 'Nomor rumah maksimal 30 karakter.'
  if (!/^(?:0|\+?62)8\d{7,12}$/.test(values.phone)) errors.phone = 'Gunakan nomor HP Indonesia, misalnya 081234567890.'
  if (values.address.length < 5 || values.address.length > 500) errors.address = 'Isi alamat lengkap, 5–500 karakter.'
  return errors
}

export function validateAccount(email: string, password: string, role: string): FieldErrors {
  const errors: FieldErrors = {}
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Masukkan alamat email yang valid.'
  if (password.length < 8 || password.length > 128) errors.password = 'Password harus berisi 8–128 karakter.'
  if (!roles.includes(role as ResidentRole)) errors.role = 'Pilih role yang tersedia.'
  return errors
}
