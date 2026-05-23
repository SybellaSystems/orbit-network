# VAC-P external push integration (Orbit Network)

This repo includes a reusable helper to push JSON payloads into VAC-P using:

- POST `${VAC_P_BASE_URL}/api/integrations/webhook`
- Header: `x-vacp-secret: ${VACP_WEBHOOK_SECRET}`

## Environment variables (set in Vercel)

Required:
- `VAC_P_BASE_URL` (e.g. `https://vacp.your-domain.com`)
- `VACP_WEBHOOK_SECRET` (shared secret from VAC-P operator)
- `VAC_P_PROJECT_ID` (VAC-P project UUID)

Preferred:
- `VAC_P_INTEGRATION_ID` (VAC-P project integration UUID)

Fallback:
- `VAC_P_PLATFORM` (VAC-P platform string). Used only if `VAC_P_INTEGRATION_ID` is not set.

## Example payload

```json
{
  "latest_task": {
    "id": "task_123",
    "title": "Review onboarding docs",
    "status": "COMPLETE",
    "updated_at": "2026-05-23T12:34:56.000Z"
  },
  "pushed_from": "orbit-network"
}
```

## Example curl

```bash
curl -X POST "${VAC_P_BASE_URL}/api/integrations/webhook" \
  -H "Content-Type: application/json" \
  -H "x-vacp-secret: ${VACP_WEBHOOK_SECRET}" \
  -d '{
    "project_id": "${VAC_P_PROJECT_ID}",
    "integration_id": "${VAC_P_INTEGRATION_ID}",
    "payload": {
      "latest_task": {
        "id": "task_123",
        "title": "Review onboarding docs",
        "status": "COMPLETE",
        "updated_at": "2026-05-23T12:34:56.000Z"
      },
      "pushed_from": "orbit-network"
    },
    "metadata": {
      "source": "manual-test",
      "timestamp": "2026-05-23T12:34:56.000Z"
    }
  }'
```

## Server endpoint (for internal/schedule testing)

A Next.js route is provided:

- `POST /api/vacp/push`

It accepts JSON:

```json
{
  "payload": { "any": "json" },
  "metadata": { "optional": "extra fields" },
  "project_id": "optional override",
  "integration_id": "optional override",
  "platform": "optional override"
}
```

## Notes on retries

The helper retries with exponential backoff (max retries: 5) when VAC-P returns 401/404/500 (and other non-200 statuses).

