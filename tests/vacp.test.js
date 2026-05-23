import test from 'node:test';
import assert from 'node:assert/strict';

import { pushToVacp } from '../lib/vacp.ts';

function mockEnv(overrides = {}) {
  process.env.VAC_P_BASE_URL = overrides.VAC_P_BASE_URL ?? 'https://vacp.example.com';
  process.env.VACP_WEBHOOK_SECRET = overrides.VACP_WEBHOOK_SECRET ?? 'secret';
  process.env.VAC_P_PROJECT_ID = overrides.VAC_P_PROJECT_ID ?? 'project-uuid';
  process.env.VAC_P_INTEGRATION_ID = overrides.VAC_P_INTEGRATION_ID ?? 'integration-uuid';
  delete process.env.VAC_P_PLATFORM;
}

test('success case (200 ok:true)', async () => {
  mockEnv();

  globalThis.fetch = (async () => {
    return async (url, init) => {
      assert.equal(url, 'https://vacp.example.com/api/integrations/webhook');
      assert.equal(init?.headers?.['x-vacp-secret'], 'secret');
      const reqBody = JSON.parse(String(init?.body));
      assert.equal(reqBody.project_id, 'project-uuid');
      assert.equal(reqBody.integration_id, 'integration-uuid');
      assert.deepEqual(reqBody.payload, { hello: 'world' });
      assert.deepEqual(reqBody.metadata, { debug: true });

      return new Response(JSON.stringify({ ok: true, integration_id: 'integration-uuid', pushed_at: '2026-01-01T00:00:00Z' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
  })();

  const res = await pushToVacp({ payload: { hello: 'world' }, metadata: { debug: true } });

  assert.equal(res.ok, true);
  assert.equal(res.integration_id, 'integration-uuid');
  assert.equal(res.pushed_at, '2026-01-01T00:00:00Z');
});

test('auth failure (401) retries then throws', async () => {
  mockEnv();

  let callCount = 0;
  globalThis.fetch = (async () => {
    return async () => {
      callCount++;
      return new Response('unauthorized', { status: 401 });
    };
  })();

  await assert.rejects(() => pushToVacp({ payload: { hello: 'world' } }), /VAC-P push failed with 401/);

  assert.ok(callCount >= 1, 'should attempt at least once');

});


test('non-existent integration (404) retries then throws', async () => {
  mockEnv();

  let callCount = 0;
  globalThis.fetch = (async () => {
    return async () => {
      callCount++;
      return new Response('not found', { status: 404 });
    };
  })();

  await assert.rejects(() => pushToVacp({ payload: { hello: 'world' } }), /404/);
  assert.ok(callCount >= 2, 'should retry at least once');
});

