import { test } from 'node:test'
import assert from 'node:assert/strict'
import { updateResidentPasswordHandler } from '../supabase/functions/update-resident-password/handler.ts'

const id = '00000000-0000-4000-8000-000000000003'
const password = 'NewDummyPassword123!'
const body = { id, password }
function setup(overrides = {}) {
  const calls = []
  const gateway = {
    authenticate: async () => true,
    canManage: async () => true,
    findResident: async () => ({ archived_at: null }),
    updatePassword: async (target, value) => {
      calls.push({ id: target, password: value })
      return { id: target }
    },
    ...overrides,
  }
  const handler = updateResidentPasswordHandler(gateway)
  const send = (values = body, auth = 'Bearer dummy-token') =>
    handler(
      new Request('https://example.test/update-resident-password', {
        method: 'POST',
        headers: { Authorization: auth },
        body: JSON.stringify(values),
      }),
    )
  return { handler, send, calls }
}

test('changes exactly the requested account password and returns only its ID', async () => {
  const { send, calls } = setup()
  const result = await send({
    ...body,
    role: 'service_role',
    email: 'ignored@example.test',
    is_active: true,
  })
  assert.equal(result.status, 200)
  assert.deepEqual(await result.json(), { id })
  assert.deepEqual(calls, [body])
})

test('password text is preserved exactly, including spaces and Unicode', async () => {
  const { send, calls } = setup()
  const value = '  SandiWarga🔑123!  '
  assert.equal((await send({ id, password: value })).status, 200)
  assert.equal(calls[0].password, value)
})

test('missing tokens, invalid tokens, and non-manager sessions cannot change a password', async () => {
  for (const options of [
    { auth: '' },
    { auth: 'Basic dummy' },
    { authenticate: async () => false },
    { canManage: async () => false },
  ]) {
    const state = setup({
      ...options,
      findResident: async () =>
        assert.fail('Unauthorized caller must not look up the target'),
    })
    const response = await state.send(body, options.auth)
    assert.equal(response.status, options.canManage ? 403 : 401)
    assert.deepEqual(state.calls, [])
  }
})

test('a revoked or demoted manager detected after target lookup cannot change the password', async () => {
  let accessChecks = 0
  const { send, calls } = setup({ canManage: async () => ++accessChecks === 1 })
  assert.equal((await send()).status, 403)
  assert.equal(accessChecks, 2)
  assert.deepEqual(calls, [])
})

test('IDs and passwords are validated before touching the target account', async () => {
  for (const values of [
    null,
    [],
    {},
    { ...body, id: 'invalid' },
    { ...body, id: 1 },
    { ...body, password: null },
    { ...body, password: 12345678 },
    { ...body, password: '' },
    { ...body, password: 'short' },
    { ...body, password: 'x'.repeat(129) },
  ]) {
    const { send, calls } = setup({
      findResident: async () =>
        assert.fail('Invalid input must not reach lookup'),
    })
    assert.equal((await send(values)).status, 400)
    assert.deepEqual(calls, [])
  }
  for (const length of [8, 128]) {
    assert.equal(
      (await setup().send({ ...body, password: 'x'.repeat(length) })).status,
      200,
    )
  }
})

test('missing and archived targets are rejected; inactive unarchived accounts can be updated', async () => {
  for (const [target, status, code] of [
    [null, 404, 'NOT_FOUND'],
    [{ archived_at: '2026-11-06T00:00:00Z' }, 409, 'RESIDENT_ARCHIVED'],
  ]) {
    const { send, calls } = setup({ findResident: async () => target })
    const response = await send()
    assert.equal(response.status, status)
    assert.equal((await response.json()).code, code)
    assert.deepEqual(calls, [])
  }
  assert.equal(
    (
      await setup({
        findResident: async () => ({ archived_at: null, is_active: false }),
      }).send()
    ).status,
    200,
  )
})

test('Auth password policies produce field errors without exposing credentials or internals', async () => {
  for (const code of ['weak_password', 'same_password']) {
    const result = await setup({
      updatePassword: async () => ({ code }),
    }).send()
    assert.equal(result.status, 400)
    const payload = await result.json()
    assert.equal(payload.code, 'INVALID_INPUT')
    assert.ok(payload.errors.password)
    assert.ok(!JSON.stringify(payload).includes(password))
  }
  const result = await setup({
    updatePassword: async () => ({ code: 'user_not_found' }),
  }).send()
  assert.equal(result.status, 404)
})

test('provider failures never claim success or echo Auth errors', async () => {
  for (const updatePassword of [
    async () => ({ code: `internal error: ${password}` }),
    async () => ({ id: 'wrong-target' }),
    async () => {
      throw new Error(`internal error: ${password}`)
    },
  ]) {
    const result = await setup({ updatePassword }).send()
    assert.equal(result.status, 503)
    assert.ok(!JSON.stringify(await result.json()).includes(password))
  }
  const result = await setup({
    canManage: async () => {
      throw new Error(password)
    },
  }).send()
  assert.equal(result.status, 503)
  assert.deepEqual(await result.json(), { code: 'SERVICE_UNAVAILABLE' })
})

test('preflight, unsupported methods, and malformed JSON are handled safely', async () => {
  const { handler, calls } = setup()
  const preflight = await handler(
    new Request('https://example.test', { method: 'OPTIONS' }),
  )
  assert.equal(preflight.status, 204)
  assert.equal(
    preflight.headers.get('Access-Control-Allow-Methods'),
    'POST, OPTIONS',
  )
  assert.equal((await handler(new Request('https://example.test'))).status, 405)
  const response = await handler(
    new Request('https://example.test', {
      method: 'POST',
      headers: { Authorization: 'Bearer dummy-token' },
      body: '{broken',
    }),
  )
  assert.equal(response.status, 400)
  assert.deepEqual(calls, [])
})
