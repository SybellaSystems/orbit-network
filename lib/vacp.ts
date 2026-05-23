

export type VacpPushResult = {
  ok: true;
  integration_id: string | null;
  pushed_at: string | null;
};

type VacpPushResponseOk = {
  ok: true;
  integration_id?: string;
  pushed_at?: string;
};

type VacpPushResponseError = {
  ok: false;
  error?: string;
};

export type VacpPayload = {
  any: unknown;
};

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getOptionalEnv(name: string): string | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  return v;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidJsonValue(value: unknown): boolean {
  if (value === null) return true;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return true;
  if (t === 'bigint' || t === 'function' || t === 'symbol' || t === 'undefined') return false;
  if (Array.isArray(value)) return value.every(isValidJsonValue);
  if (t === 'object') {
    // JSON.stringify will serialize Date to ISO string via toJSON; accept it.
    if (value instanceof Date) return true;
    // For plain objects, ensure all values are JSON-valid.
    return Object.values(value as Record<string, unknown>).every(isValidJsonValue);
  }
  return false;
}


export type PushToVacpInput = {
  payload: unknown;
  metadata?: Record<string, unknown>;
  // If you want to override config per call.
  projectId?: string;
  integrationId?: string;
  platform?: string;
};

export async function pushToVacp(input: PushToVacpInput): Promise<VacpPushResult> {
  const baseUrl = getEnv('VAC_P_BASE_URL');
  const secret = getEnv('VACP_WEBHOOK_SECRET');

  const project_id = input.projectId ?? getEnv('VAC_P_PROJECT_ID');
  const integration_id = input.integrationId ?? getOptionalEnv('VAC_P_INTEGRATION_ID');
  const platform = input.platform ?? getOptionalEnv('VAC_P_PLATFORM');

  if (!integration_id && !platform) {
    throw new Error('Missing VAC_P_INTEGRATION_ID (preferred) or VAC_P_PLATFORM');
  }

  // VAC-P expects a JSON payload under `payload`.
  if (!isValidJsonValue(input.payload)) {
    throw new Error('payload must be valid JSON-serializable value');
  }

  const body: Record<string, unknown> = {
    project_id,
    integration_id: integration_id ?? undefined,
    platform: integration_id ? undefined : (platform ?? ''),
    payload: input.payload,
    metadata: input.metadata ?? undefined,
  };

  // Remove undefined keys to keep body clean.
  for (const k of Object.keys(body)) {
    if (body[k] === undefined) delete body[k];
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/integrations/webhook`;

  const maxRetries = 5;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      const res = await fetch(url, {

        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vacp-secret': secret,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 200) {
        const json = (await res.json().catch(() => ({}))) as VacpPushResponseOk | VacpPushResponseError;
        if ('ok' in json && json.ok === true) {
          return {
            ok: true,
            integration_id: json.integration_id ?? null,
            pushed_at: json.pushed_at ?? null,
          };
        }
        throw new Error(`VAC-P returned 200 but payload ok!=true: ${JSON.stringify(json)}`);
      }

      if ([401, 404, 500].includes(res.status)) {
        const text = await res.text().catch(() => '');
        throw new Error(`VAC-P push failed with ${res.status}: ${text}`);
      }

      // For other status codes, treat as retryable up to maxRetries.
      const text = await res.text().catch(() => '');
      throw new Error(`VAC-P push failed with ${res.status}: ${text}`);
    } catch (err) {
      lastError = err;
      const retryable = attempt < maxRetries;
      if (!retryable) break;

      // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
      const backoffMs = 500 * Math.pow(2, attempt);
      await sleep(backoffMs);
      attempt += 1;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

