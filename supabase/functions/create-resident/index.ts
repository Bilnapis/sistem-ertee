import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { createResidentHandler } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL')!
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
const callerClient = (token: string) => createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
  global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
})

Deno.serve(createResidentHandler({
  async authenticate(token) {
    const { data, error } = await admin.auth.getUser(token)
    if (error || !data.user) return null
    try {
      const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      return { id: data.user.id, sessionId: claims.session_id ?? '' }
    } catch { return null }
  },
  async canManage(token) {
    const { data, error } = await callerClient(token).rpc('resident_management_access')
    if (error) throw error
    return data === true
  },
  async findById(id) {
    const { data, error } = await admin.auth.admin.getUserById(id)
    if (error && error.status !== 404) throw error
    return data.user ?? null
  },
  async nikExists(nik) {
    const { data, error } = await admin.from('profiles').select('id').eq('nik', nik).limit(1)
    if (error) throw error
    return Boolean(data?.length)
  },
  async create(input) {
    const { data, error } = await admin.auth.admin.createUser(input)
    return { user: data.user, code: error?.code }
  },
}))
