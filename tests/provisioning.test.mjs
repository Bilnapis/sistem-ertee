import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createResidentHandler } from '../supabase/functions/create-resident/handler.ts'

const actor = '00000000-0000-4000-8000-000000000001'
const body = { request_id: '00000000-0000-4000-8000-000000000010', full_name: 'Warga Dummy', nik: '0000000000000010', family_card_number: '0000000000000099', gender: 'perempuan', marital_status: 'menikah', house_number: '10', phone: '0812-3456-7890', address: 'Jalan Dummy Nomor 10', email: 'dummy10@example.test', password: 'DummyPassword123!', role: 'pengurus_rt', is_active: true }
function setup(overrides = {}) {
  const users = new Map(), calls = []
  const gateway = {
    authenticate: async () => ({ id: actor, sessionId: actor.replace('8000', '9000') }),
    canManage: async () => true, findById: async id => users.get(id) ?? null, nikExists: async () => false,
    create: async input => { calls.push(input); const user = { id: input.id, app_metadata: input.app_metadata }; users.set(input.id, user); return { user } },
    ...overrides,
  }
  const handler = createResidentHandler(gateway)
  const send = (values = body, auth = 'Bearer dummy-token') => handler(new Request('https://example.test/create-resident', { method: 'POST', headers: { Authorization: auth }, body: JSON.stringify(values) }))
  return { send, handler, calls, users, gateway }
}
test('creates a confirmed account with trusted role metadata and a normalized profile', async () => {
  const { send, calls } = setup()
  const result = await send()
  assert.equal(result.status, 201)
  assert.deepEqual(await result.json(), { id: body.request_id })
  assert.equal(calls[0].email_confirm, true)
  assert.equal(calls[0].user_metadata.phone, '081234567890')
  assert.equal(calls[0].user_metadata.house_block, undefined)
  assert.equal(calls[0].user_metadata.role, undefined)
  assert.equal(calls[0].user_metadata.password, undefined)
  assert.equal(calls[0].app_metadata.ertee_creation.actor_id, actor)
  assert.equal(calls[0].app_metadata.ertee_creation.role, 'pengurus_rt')
  assert.ok(!JSON.stringify(calls[0].app_metadata).includes(body.password))
})
test('a retry recovers exactly one account and rejects changed inputs or a different actor', async () => {
  const { send, calls, gateway } = setup()
  assert.equal((await send()).status, 201)
  assert.equal((await send()).status, 200)
  assert.equal(calls.length, 1)
  assert.equal((await send({ ...body, role: 'ketua_rt' })).status, 409)
  gateway.authenticate = async () => ({ id: body.request_id, sessionId: actor })
  assert.equal((await send()).status, 409)
})
test('missing/invalid sessions and non-managers never reach account creation', async () => {
  const { send, calls } = setup()
  assert.equal((await send(body, '')).status, 401)
  assert.equal((await setup({ authenticate: async () => null }).send()).status, 401)
  assert.equal((await setup({ canManage: async () => false }).send()).status, 403)
  assert.equal(calls.length, 0)
})
test('validates identity, account data, role, and request IDs server-side', async () => {
  for (const invalid of [{ nik: '123' }, { family_card_number: '' }, { gender: 'invalid' }, { password: 'short' }, { email: 'invalid' }, { role: 'service_role' }, { request_id: 'invalid' }, { is_active: 'true' }]) {
    const { send, calls } = setup()
    assert.equal((await send({ ...body, ...invalid })).status, 400)
    assert.equal(calls.length, 0)
  }
})
test('duplicate identities and Auth errors return safe actionable codes', async () => {
  const duplicate = await setup({ nikExists: async () => true }).send()
  assert.equal(duplicate.status, 409)
  assert.equal((await duplicate.json()).code, 'DUPLICATE_NIK')
  const email = await setup({ create: async () => ({ user: null, code: 'email_exists' }) }).send()
  assert.equal((await email.json()).code, 'DUPLICATE_EMAIL')
  const failure = await setup({ create: async () => { throw new Error(`database internals ${body.password}`) } }).send()
  assert.equal(failure.status, 503)
  assert.equal((await failure.json()).code, 'SERVICE_UNAVAILABLE')
})
test('a duplicate-UUID race recovers the identical completed operation', async () => {
  const state = setup()
  const create = state.gateway.create
  state.gateway.create = async input => { await create(input); return { user: null, code: 'unexpected_failure' } }
  assert.equal((await state.send()).status, 200)
  assert.equal(state.calls.length, 1)
})
test('preflight and malformed payloads are handled without throwing', async () => {
  const { handler } = setup()
  assert.equal((await handler(new Request('https://example.test', { method: 'OPTIONS' }))).status, 204)
  assert.equal((await handler(new Request('https://example.test'))).status, 405)
  for (const raw of ['broken json', 'null', '[]']) assert.equal((await handler(new Request('https://example.test', { method: 'POST', headers: { Authorization: 'Bearer dummy' }, body: raw }))).status, 400)
})
