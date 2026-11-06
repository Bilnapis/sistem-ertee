import { validatePassword } from '../_shared/resident.ts'

export type PasswordGateway = {
  authenticate: (token: string) => Promise<boolean>
  canManage: (token: string) => Promise<boolean>
  findResident: (
    token: string,
    id: string,
  ) => Promise<{ archived_at: string | null } | null>
  updatePassword: (
    id: string,
    password: string,
  ) => Promise<{ id?: string; code?: string }>
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const respond = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: cors })

export function updateResidentPasswordHandler(gateway: PasswordGateway) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST')
      return respond(405, { code: 'METHOD_NOT_ALLOWED' })
    try {
      const token = request.headers
        .get('authorization')
        ?.match(/^Bearer (.+)$/i)?.[1]
      if (!token || !(await gateway.authenticate(token)))
        return respond(401, { code: 'SESSION_REQUIRED' })
      if (!(await gateway.canManage(token)))
        return respond(403, { code: 'ACCESS_DENIED' })

      const body = await request.json().catch(() => null)
      if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        typeof body.id !== 'string' ||
        !uuid.test(body.id) ||
        typeof body.password !== 'string'
      )
        return respond(400, { code: 'INVALID_INPUT' })
      const errors = validatePassword(body.password)
      if (Object.keys(errors).length)
        return respond(400, { code: 'INVALID_INPUT', errors })

      const target = await gateway.findResident(token, body.id)
      if (!target) return respond(404, { code: 'NOT_FOUND' })
      if (target.archived_at) return respond(409, { code: 'RESIDENT_ARCHIVED' })
      // Recheck live session/role after the lookup, before using Auth Admin.
      if (!(await gateway.canManage(token)))
        return respond(403, { code: 'ACCESS_DENIED' })
      const result = await gateway.updatePassword(body.id, body.password)
      if (result.id === body.id) return respond(200, { id: result.id })
      if (result.code === 'weak_password')
        return respond(400, {
          code: 'INVALID_INPUT',
          errors: {
            password:
              'Password belum memenuhi kebijakan keamanan. Gunakan kombinasi huruf, angka, dan simbol.',
          },
        })
      if (result.code === 'same_password')
        return respond(400, {
          code: 'INVALID_INPUT',
          errors: {
            password: 'Gunakan password yang berbeda dari password saat ini.',
          },
        })
      if (result.code === 'user_not_found')
        return respond(404, { code: 'NOT_FOUND' })
      return respond(503, { code: 'PASSWORD_UPDATE_FAILED' })
    } catch {
      // Never return credentials, submitted data, or Auth internals.
      return respond(503, { code: 'SERVICE_UNAVAILABLE' })
    }
  }
}
