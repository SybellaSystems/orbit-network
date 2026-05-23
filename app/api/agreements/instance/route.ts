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

const CreateInstanceSchema = z.object({
  agreement_id: z.string().uuid(),
  filled_data: z.record(z.any()).optional().default({}),
  created_by: z.string().uuid().optional(),
  parties: z
    .array(
      z.object({
        full_name: z.string().min(1),
        id_number: z.string().optional(),
        role: z.string().min(1),
        signature_data: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

export async function POST(req: Request) {
  const body = CreateInstanceSchema.parse(await req.json());

  const xUserId = req.headers.get('x-user-id');
  const createdBy = body.created_by ?? xUserId;
  if (!createdBy) return NextResponse.json({ ok: false, error: 'Missing x-user-id' }, { status: 401 });

  // Basic existence check
  const { data: agreement, error: agreementErr } = await supabase
    .from('agreements')
    .select('id')
    .eq('id', body.agreement_id)
    .maybeSingle();

  if (agreementErr) return NextResponse.json({ ok: false, error: agreementErr.message }, { status: 400 });
  if (!agreement) return NextResponse.json({ ok: false, error: 'Agreement not found' }, { status: 404 });

  const { data: instance, error: instanceErr } = await supabase
    .from('agreement_instances')
    .insert({
      agreement_id: body.agreement_id,
      created_by: createdBy,
      filled_data: body.filled_data,
      status: 'draft',
    })
    .select('*')
    .single();

  if (instanceErr) return NextResponse.json({ ok: false, error: instanceErr.message }, { status: 400 });

  // Insert parties if provided
  if (body.parties.length > 0) {
    const rows = body.parties.map((p) => ({
      agreement_instance_id: instance.id,
      full_name: p.full_name,
      id_number: p.id_number ?? null,
      role: p.role,
      signature_data: p.signature_data ?? null,
    }));

    const { error: partiesErr } = await supabase.from('agreement_parties').insert(rows);
    if (partiesErr) {
      // best-effort: don't delete instance; log-like behavior for now
      return NextResponse.json({ ok: false, error: partiesErr.message }, { status: 400 });
    }
  }

  // log created
  await supabase.from('agreement_logs').insert({
    agreement_instance_id: instance.id,
    action: 'created',
    performed_by: createdBy,
    metadata: body,
  });

  return NextResponse.json({ ok: true, data: instance });
}

