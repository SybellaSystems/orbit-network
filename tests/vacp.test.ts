import test from 'node:test';
import assert from 'node:assert/strict';

import { pushToVacp } from '../lib/vacp.js';



function mockEnv(overrides: Record<string, string | undefined> = {}) {
  process.env.VAC_P_BASE_URL = overrides.VAC_P_BASE_URL ?? 'https://vacp.example.com';
  process.env.VACP_WEBHOOK_SECRET = overrides.VACP_WEBHOOK_SECRET ?? 'secret';
  process.env.VAC_P_PROJECT_ID = overrides.VAC_P_PROJECT_ID ?? 'project-uuid';
  process.env.VAC_P_INTEGRATION_ID = overrides.VAC_P_INTEGRATION_ID ?? 'integration-uuid';
  delete process.env.VAC_P_PLATFORM;
}

test('success case (200 ok:true)', async () => {
  mockEnv();

  globalThis.fetch = (async () => {
    let calls = 0;
    return async (url: string, init?: RequestInit) => {
      calls++;
      assert.equal(url, 'https://vacp.example.com/api/integrations/webhook');
      assert.equal((init?.headers as any)?.['x-vacp-secret'], 'secret');
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
  })() as any;

  const res = await pushToVacp({
    payload: { hello: 'world' },
    metadata: { debug: true },
  });

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
  })() as any;

  await assert.rejects(
    () =>
      pushToVacp({
        payload: { hello: 'world' },
      }),
    /401/
  );

  // maxRetries=5 => attempts up to 6
  assert.ok(callCount >= 2, 'should retry at least once');
});

test('non-existent integration (404) retries then throws', async () => {
  mockEnv();

  let callCount = 0;
  globalThis.fetch = (async () => {
    return async () => {
      callCount++;
      return new Response('not found', { status: 404 });
    };
  })() as any;

  await assert.rejects(
    () =>
      pushToVacp({
        payload: { hello: 'world' },
      }),
    /404/
  );

  assert.ok(callCount >= 2, 'should retry at least once');
});

