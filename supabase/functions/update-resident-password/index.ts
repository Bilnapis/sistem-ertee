import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { updateResidentPasswordHandler } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL')!
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const callerClient = (token: string) =>
  createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

Deno.serve(
  updateResidentPasswordHandler({
    async authenticate(token) {
      const { data, error } = await admin.auth.getUser(token)
      return !error && Boolean(data.user)
    },
    async canManage(token) {
      const { data, error } = await callerClient(token).rpc(
        'resident_management_access',
      )
      if (error) throw error
      return data === true
    },
    async findResident(token, id) {
      const { data, error } = await callerClient(token)
        .from('profiles')
        .select('archived_at')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    async updatePassword(id, password) {
      const { data, error } = await admin.auth.admin.updateUserById(id, {
        password,
      })
      return { id: error ? undefined : data.user?.id, code: error?.code }
    },
  }),
)
