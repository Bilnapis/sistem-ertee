export type Registration = {
  full_name: string
  email: string
  nik: string
  phone: string
  address: string
  house_block: string
  password: string
  confirmation: string
}

export type FieldErrors = Partial<Record<keyof Registration, string>>
export const emptyRegistration: Registration = {
  full_name: '', email: '', nik: '', phone: '', address: '', house_block: '', password: '', confirmation: '',
}

export function validateRegistration(values: Registration): FieldErrors {
  const errors: FieldErrors = {}
  if (values.full_name.trim().length < 2) errors.full_name = 'Isi nama lengkap, minimal 2 karakter.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Masukkan alamat email yang valid.'
  if (!/^\d{16}$/.test(values.nik)) errors.nik = 'NIK harus berisi tepat 16 digit angka.'
  if (!/^(?:0|\+?62)8\d{7,12}$/.test(values.phone.trim())) errors.phone = 'Gunakan nomor HP Indonesia, misalnya 081234567890.'
  if (values.address.trim().length < 5) errors.address = 'Isi alamat lengkap, minimal 5 karakter.'
  if (!values.house_block.trim()) errors.house_block = 'Isi nomor atau blok rumah.'
  if (values.password.length < 8) errors.password = 'Password minimal 8 karakter.'
  if (values.password.length > 128) errors.password = 'Password maksimal 128 karakter.'
  if (values.password !== values.confirmation || !values.confirmation) errors.confirmation = 'Konfirmasi password harus sama.'
  return errors
}
