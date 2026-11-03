import { normalizeResident, validateAccount, validateResident } from '../_shared/resident.ts'
import type { ResidentFields, ResidentRole } from '../_shared/resident.ts'

type CreatedUser = { id: string; app_metadata: Record<string, unknown> }
export type CreateAccountInput = {
  id: string; email: string; password: string; email_confirm: true
  user_metadata: ResidentFields
  app_metadata: { ertee_creation: { actor_id: string; session_id: string; role: ResidentRole; is_active: boolean; fingerprint: string } }
}
export type ProvisioningGateway = {
  authenticate: (token: string) => Promise<{ id: string; sessionId: string } | null>
  canManage: (token: string) => Promise<boolean>
  findById: (id: string) => Promise<CreatedUser | null>
  nikExists: (nik: string) => Promise<boolean>
  create: (input: CreateAccountInput) => Promise<{ user: CreatedUser | null; code?: string }>
}
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const respond = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: cors })

export function createResidentHandler(gateway: ProvisioningGateway) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return respond(405, { code: 'METHOD_NOT_ALLOWED' })
    try {
      const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
      if (!token) return respond(401, { code: 'SESSION_REQUIRED' })
      const caller = await gateway.authenticate(token)
      if (!caller || !uuid.test(caller.sessionId)) return respond(401, { code: 'SESSION_REQUIRED' })
      if (!await gateway.canManage(token)) return respond(403, { code: 'ACCESS_DENIED' })
      const raw = await request.text()
      if (raw.length > 12000) return respond(413, { code: 'INVALID_INPUT' })
      let body: Record<string, unknown>
      try {
        const parsed: unknown = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
        body = parsed as Record<string, unknown>
      } catch { return respond(400, { code: 'INVALID_INPUT' }) }
      const id = typeof body.request_id === 'string' ? body.request_id : ''
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
      const password = typeof body.password === 'string' ? body.password : ''
      const role = typeof body.role === 'string' ? body.role : ''
      const fields = normalizeResident(body)
      const errors = { ...validateResident(fields), ...validateAccount(email, password, role) }
      if (!uuid.test(id) || typeof body.is_active !== 'boolean' || Object.keys(errors).length) {
        return respond(400, { code: 'INVALID_INPUT', errors })
      }
      // The fingerprint excludes credentials. Retrying a timed-out request may only
      // recover the same actor's identical operation, never an unrelated account.
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ fields, email, role, active: body.is_active })))
      const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
      const recover = (user: CreatedUser | null): Response | null => {
        if (!user) return null
        const marker = user.app_metadata.ertee_creation as { actor_id?: string; fingerprint?: string } | undefined
        return marker?.actor_id === caller.id && marker.fingerprint === fingerprint
          ? respond(200, { id: user.id }) : respond(409, { code: 'REQUEST_CONFLICT' })
      }
      const previous = recover(await gateway.findById(id))
      if (previous) return previous
      if (await gateway.nikExists(fields.nik)) return respond(409, { code: 'DUPLICATE_NIK' })
      const result = await gateway.create({ id, email, password, email_confirm: true, user_metadata: fields,
        app_metadata: { ertee_creation: { actor_id: caller.id, session_id: caller.sessionId,
          role: role as ResidentRole, is_active: body.is_active, fingerprint } } })
      if (result.user) return respond(201, { id: result.user.id })
      const recovered = recover(await gateway.findById(id))
      if (recovered) return recovered
      if (await gateway.nikExists(fields.nik)) return respond(409, { code: 'DUPLICATE_NIK' })
      if (['email_exists', 'user_already_exists'].includes(result.code ?? '')) return respond(409, { code: 'DUPLICATE_EMAIL' })
      return respond(503, { code: 'CREATE_FAILED' })
    } catch {
      // Never echo Auth internals, submitted credentials, or personal data.
      return respond(503, { code: 'SERVICE_UNAVAILABLE' })
    }
  }
}
