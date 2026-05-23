import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pushToVacp } from '@/lib/vacp';

export const runtime = 'nodejs';

const BodySchema = z.object({
  payload: z.any(),
  metadata: z.record(z.any()).optional(),
  // Preferred overrides
  integration_id: z.string().optional(),
  // Fallback override
  platform: z.string().optional(),
  project_id: z.string().optional(),
});

export async function POST(req: Request) {
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  // pushToVacp throws on auth/notfound/etc; route maps to status codes for easier debugging/tests.
  try {
    const result = await pushToVacp({
      payload: body.payload,
      metadata: body.metadata,
      integrationId: body.integration_id,
      platform: body.platform,
      projectId: body.project_id,
    });

    return NextResponse.json({
      ok: true,
      integration_id: result.integration_id,
      pushed_at: result.pushed_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Map common VAC-P error status hints.
    if (message.includes('401')) {
      return NextResponse.json({ ok: false, error: message }, { status: 401 });
    }
    if (message.includes('404')) {
      return NextResponse.json({ ok: false, error: message }, { status: 404 });
    }
    if (message.includes('500')) {
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

