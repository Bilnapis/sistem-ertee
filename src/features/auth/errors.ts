export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code
  const message = error instanceof Error ? error.message : ''
  if (message === 'SUPABASE_NOT_CONFIGURED') return 'Koneksi layanan belum disiapkan. Ikuti panduan setup di README.'
  if (code === 'invalid_credentials') return 'Email atau password tidak sesuai. Periksa kembali dan coba lagi.'
  if (code === 'email_not_confirmed') return 'Email belum dikonfirmasi. Buka tautan konfirmasi yang dikirim ke email Anda.'
  if (code === 'weak_password' || code === 'same_password') return 'Gunakan password yang lebih kuat, minimal 8 karakter.'
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.'
  if (code === 'user_already_exists' || code === 'email_exists') return 'Pendaftaran belum dapat diproses. Coba masuk atau hubungi pengurus RT.'
  if (message === 'PROFILE_UNAVAILABLE') return 'Profil tidak tersedia atau akun dinonaktifkan. Hubungi pengurus RT.'
  if (message === 'Failed to fetch' || error instanceof TypeError) return 'Layanan tidak dapat dihubungi. Periksa koneksi internet dan coba lagi.'
  return 'Permintaan belum berhasil. Coba lagi atau hubungi pengurus RT.'
}
