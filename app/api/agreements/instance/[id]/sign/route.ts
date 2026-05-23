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

const SignSchema = z.object({
  status: z.enum(['pending_signature', 'signed']).optional(),
  parties: z
    .array(
      z.object({
        agreement_party_id: z.string().uuid().optional(),
        full_name: z.string().min(1).optional(),
        signature_data: z.string().min(1),
        signature_date: z.string().datetime().optional(),
      })
    )
    .optional(),
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const instanceId = ctx.params.id;
  if (!instanceId) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

  const body = SignSchema.parse(await req.json().catch(() => ({})));

  const xUserId = req.headers.get('x-user-id');
  if (!xUserId) return NextResponse.json({ ok: false, error: 'Missing x-user-id' }, { status: 401 });

  // Fetch current status + signed_at
  const { data: instance, error: instErr } = await supabase
    .from('agreement_instances')
    .select('id,status,signed_at')
    .eq('id', instanceId)
    .maybeSingle();

  if (instErr) return NextResponse.json({ ok: false, error: instErr.message }, { status: 400 });
  if (!instance) return NextResponse.json({ ok: false, error: 'Instance not found' }, { status: 404 });

  const signatureDate = new Date().toISOString();

  const partiesPayload = body.parties ?? [];

  // Enforce signing immutability properly:
  // - If already signed, only allow idempotent calls where signatures do not change.
  if (instance.status === 'signed') {
    if (partiesPayload.length > 0) {
      const providedPartyIds = partiesPayload.map((p) => p.agreement_party_id).filter(Boolean) as string[];
      if (providedPartyIds.length === 0) {
        return NextResponse.json(
          { ok: false, error: 'Immutable signed instance: party ids are required for signature checks' },
          { status: 409 }
        );
      }

      const { data: existingParties, error: existingErr } = await supabase
        .from('agreement_parties')
        .select('id,signature_data')
        .eq('agreement_instance_id', instanceId)
        .in('id', providedPartyIds);

      if (existingErr) return NextResponse.json({ ok: false, error: existingErr.message }, { status: 400 });

      const existingById = new Map((existingParties ?? []).map((p) => [p.id, p]));

      for (const p of partiesPayload) {
        const partyId = p.agreement_party_id;
        if (!partyId) continue;
        const existing = existingById.get(partyId);
        if (!existing) {
          return NextResponse.json(
            { ok: false, error: 'Immutable signed instance: unknown party' },
            { status: 409 }
          );
        }
        if (existing.signature_data !== p.signature_data) {
          return NextResponse.json(
            { ok: false, error: 'Immutable signed instance: signatures cannot be modified after signing' },
            { status: 409 }
          );
        }
      }
    }

    // Idempotent success: do not rewrite signatures or signed_at.
    return NextResponse.json({ ok: true, data: { id: instanceId, status: 'signed' } });
  }

  // If not signed yet, we allow transitioning to signed and persisting signatures.
  if (partiesPayload.length > 0) {
    for (const p of partiesPayload) {
      if (!p.agreement_party_id) continue; // cannot reliably attach without id

      await supabase
        .from('agreement_parties')
        .update({
          signature_data: p.signature_data,
          signature_date: p.signature_date ? new Date(p.signature_date).toISOString() : signatureDate,
        })
        .eq('id', p.agreement_party_id)
        .eq('agreement_instance_id', instanceId);
    }
  }

  const nextStatus = 'signed' as const;

  const { error: updErr } = await supabase
    .from('agreement_instances')
    .update({ status: nextStatus, signed_at: signatureDate })
    .eq('id', instanceId);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });

  await supabase.from('agreement_logs').insert({
    agreement_instance_id: instanceId,
    action: 'signed',
    performed_by: xUserId,
    metadata: { signatureDate },
  });

  return NextResponse.json({ ok: true, data: { id: instanceId, status: nextStatus } });
}


