import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } },
});

const UpdateInstanceSchema = z.object({
  filled_data: z.record(z.any()).optional(),
  status: z.enum(['draft','pending_signature','signed','active','terminated']).optional(),
});

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const instanceId = ctx.params.id;
  const xUserId = req.headers.get('x-user-id');
  if (!xUserId) return NextResponse.json({ ok: false, error: 'Missing x-user-id' }, { status: 401 });

  const body = UpdateInstanceSchema.parse(await req.json());

  const { data: instance, error: instErr } = await supabase
    .from('agreement_instances')
    .select('id,status,created_by')
    .eq('id', instanceId)
    .maybeSingle();

  if (instErr) return NextResponse.json({ ok: false, error: instErr.message }, { status: 400 });
  if (!instance) return NextResponse.json({ ok: false, error: 'Instance not found' }, { status: 404 });

  if (instance.status === 'signed') {
    return NextResponse.json({ ok: false, error: 'Signed instances are immutable' }, { status: 409 });
  }

  const { error: updErr } = await supabase
    .from('agreement_instances')
    .update({
      filled_data: body.filled_data ?? undefined,
      status: body.status ?? undefined,
    })
    .eq('id', instanceId)
    .eq('created_by', xUserId);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });

  await supabase.from('agreement_logs').insert({
    agreement_instance_id: instanceId,
    action: 'edited',
    performed_by: xUserId,
    metadata: body,
  });

  return NextResponse.json({ ok: true });
}

